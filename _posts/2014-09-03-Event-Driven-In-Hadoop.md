---
layout: post
title: Hadoop中的事件驱动模型
description: "Event-driven model in hadoop"
modified: 2014-09-03
tags: [java,application]
imagefeature: cs-8.jpg
category: Javadevelopment
comments: true
share: true
---
YARN采用了基于事件驱动的并发模型。该模型能极大的提高并发性，并且可以简化事件的处理。


##基本架构

常规事件驱动模型架构图如下：
<figure><img src="/images/event-driven/basic.jpg"/></figure>

该模型几个主要的参与者为：Event（事件），EventHandler（事件处理器）以及Dispatcher（事件派发器）。

该模式下，事件处理一般为如下步骤：

- 1.在派发器中为指定的事件类型注册相应的事件处理器
- 2.发起者生成一个需要处理的事件，并交由派发器
- 3.派发器中注册的处理器中找到对应的处理器，交由其处理

##接口

###Event
对于事件类型，最重要的就是其事件的类型。因为派发器需要通过该属性来决定将其派发给哪一个处理器。
{% highlight java %}
public interface Event<TYPE extends Enum<TYPE>> {
	TYPE getType();
}
{% endhighlight %}


###Dispatcher

派发器需要完成两个任务：1.给指定事件类型注册处理器；2.根据事件，派发对应的事件处理器。

派发器可以简单的理解为一个Map，将每个事件根据其类型，映射到对于的处理器上。
{% highlight java %}
public interface Dispatcher {
	EventHandler getEventHandler(EventType type);
	void register(Class<? extends Enum> eventType, EventHandler handler);
}
{% endhighlight %}


###EventHandler

处理器完成的任务就简单了，处理该事件即可。该处理可以使直接处理，也可以生成新的事件，并交由新事件的处理器处理。
{% highlight java %}
public interface EventHandler<T extends Event> {
	void handle(T event);
}
{% endhighlight %}

###Simple Demo

如下是一个简单的事件驱动的模型实例：
{% highlight java %}
public class BasicEventDrivenDemo {
    private static enum EventType{
        E_START,
        E_STOP;
    }

    private static class MyEvent implements Event<EventType>{
        private final EventType type;
        public MyEvent(EventType type){
            this.type = type;
        }
        @Override
        public EventType getType() {
            return type;
        }

        @Override
        public String toString() {
            return "MyEvent: " + type;
        }
    }
   
	private static class MyDispatcher implements Dispatcher{
        private final Map<Class<? extends Enum>,EventHandler<MyEvent>> handlers;

        public MyDispatcher(){
            handlers = new HashMap<>();
        }

        @Override
        public EventHandler getEventHandler(Class<? extends Enum> type) {
            synchronized (handlers){
                return handlers.get(type);
            }
        }

        @Override
        public void registerEventHandler(Class<? extends Enum> eventType, EventHandler handler) {
            synchronized (handlers){
                handlers.put(eventType,handler);
            }
        }
    }

    private static class MyEventHandler implements EventHandler<MyEvent>{
        @Override
        public void handle(MyEvent event) {
            System.out.println("MyEventHandler is handling " + event);
        }
    }

    public static void main(String[] args) {
        MyDispatcher dispatcher = new MyDispatcher();
        dispatcher.registerEventHandler(EventType.class,new MyEventHandler());
        dispatcher.getEventHandler(EventType.class).handle(new MyEvent(EventType.E_START));
        dispatcher.getEventHandler(EventType.class).handle(new MyEvent(EventType.E_STOP));
    }
}
{% endhighlight %}

该模型中，首先注册相应事件类型的处理器，然后就可以从中根据事件类型获取处理器来处理主要处理的事件。
这种方式解决了调用器的热插拔，使得事件的处理与事件处理的调用分离。

但是这种方式有几个缺陷：

- 调用者需要根据事件类型去获取相应的事件处理器
- 事件的调用与事件的处理仍然是在一个线程中，调用者仍然需要在调用处理结束之后才能返回
- 事件处理器无法生成新的事件等待接下来的处理

##异步派发器


异步派发器即拥有自己的处理线程，新事件得到时，仅仅将该事件放在待处理事件堆中，该调用即可返回，而后续的事件处理将会有处理线程来进行。

如下是异步派发器的简单示意图：
<firgure><img src="/images/event-driven/sync.jpg"/></figure>

异步派发器最大的不同在于拥有自己的处理线程。事件发起者需要处理事件时，其调用仅仅是将事件放入待处理队列中而已，之后就调用返回。而事件的真正处理实在处理线程中，这些线程不断冲待处理事件队列中提取需要处理的事件并进行处理。

可以看到，这种模式下，事件发起者发起事件与事件的真正处理是异步的，它们在不同的线程中执行。

异步派发器：

{% highlight java %}
public class AsyncDispatcher implements Dispatcher,Service {

    //Map from event type name to handler
    private final Map<Class<? extends Enum>,EventHandler> handlerMap = new HashMap<>();
    private final BlockingQueue<Event> eventQueue = new LinkedBlockingQueue<>();
    private final int handlers;
    private final Thread[] handlerThreads;

    public AsyncDispatcher(int size){
        handlers = size;
        handlerThreads = new Thread[handlers];
    }

    @Override
    public EventHandler getEventHandler() {
        return new GenericEventHandler<>();
    }

    @Override
    public void registerEventHandler(Class<? extends Enum> eventType, EventHandler handler) {
        synchronized (handlerMap){
            if (handlerMap.get(eventType) == null){
                handlerMap.put(eventType,handler);
            }
        }
    }

    @Override
    public void start() {
        for(Thread thread : handlerThreads){
            thread.start();
        }
    }

    @Override
    public void init() {
        for(int i = 0; i < handlerThreads.length; i++){
            handlerThreads[i] = new Thread(createHandThread());
        }
    }

    @Override
    public void stop() {
        for(Thread thread : handlerThreads){
            thread.interrupt();
        }
    }

    protected void dispath(Event event){
        synchronized (handlerMap){
            EventHandler handler = handlerMap.get(event.getType().getDeclaringClass());
            if (handler == null){
                throw new RuntimeException("No handler found for event: " + event);
            }
            handler.handle(event);
        }
    }

    protected Runnable createHandThread(){
        return ()->{
          while (!Thread.currentThread().isInterrupted()){
              try {
                  Event event = eventQueue.take();
                  dispath(event);
              } catch (InterruptedException e) {
                  //if.exit.
                  continue;
              }
          }
        };
    }

    private  class GenericEventHandler<E extends Event> implements EventHandler<E>{
        @Override
        public void handle(E event) {
            synchronized (eventQueue){
                try {
                    eventQueue.put(event);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();	
                }
            }
        }
    }
}

{% endhighlight %}


- getEventHandler()返回一个内部类的对象，而该对象处理事件仅仅是将其放入事件队列中

- 派发器维护了一组线程，即事件处理线程；这些线程的行为从createHandThread()中可以看到，它们不断的从事件队列中获取事件并使用dispath()方法进行处理

- handlerMap建立了事件类型与事件处理器的映射


异步派发器使用Demo：

{% highlight java %}
public class EventDrivenTest {

    public static enum TaskEventType {
        T_KILL,
        T_SCHEDULE;
    }

    public static enum JobEventType {
        JOB_KILL,
        JOB_INIT,
        JOB_START;
    }

    public static class TaskEvent extends AbstractEvent<TaskEventType> {

        private final String taskID;

        public TaskEvent(String taskID, TaskEventType type) {
            super(type);
            this.taskID = taskID;
        }

        public String getTaskID() {
            return taskID;
        }

        @Override
        public String toString() {
            return "TaskEvent " + taskID + " type " + getType();
        }
    }

    public static class JobEvent extends AbstractEvent<JobEventType> {

        private final String jobID;

        public JobEvent(String jobID, JobEventType jobEventType) {
            super(jobEventType);
            this.jobID = jobID;
        }

        public String getJobID() {
            return jobID;
        }

        @Override
        public String toString() {
            return "JobEvent " + jobID +" type " + getType();
        }
    }

    public static class SimpleMRAppMaster extends CompositeServer {

        private Dispatcher dispatcher;
        private String jobID;
        private int taskNummber;
        private String[] taskIDs;

        public SimpleMRAppMaster(String jobID, int taskNummber) {
            this.jobID = jobID;
            this.taskNummber = taskNummber;

            taskIDs = new String[taskNummber];
            for (int i = 0; i < taskNummber; i++) {
                taskIDs[i] = jobID + "_task_" + i;
            }
        }

        @Override
        public void init() {
            super.init();
            dispatcher = new AsyncDispatcher(5);
            dispatcher.init();
            dispatcher.registerEventHandler(JobEventType.class,new JobEventHandler());
            dispatcher.registerEventHandler(TaskEventType.class,new TaskEventHandler());
            addService(dispatcher);
        }

        public  class TaskEventHandler implements EventHandler<TaskEvent> {
            @Override
            public void handle(TaskEvent event) {
                System.out.println("Handling event " + event);
                if (event.getType() == TaskEventType.T_KILL) {
                    System.out.println("Received T_KILL event of task " + event.getTaskID());
                }else if (event.getType() == TaskEventType.T_SCHEDULE){
                    System.out.println("Received T_SCHEDULE event of task " + event.getTaskID());
                }
            }
        }

        public Dispatcher getDispatcher(){
            return dispatcher;
        }

        public class JobEventHandler implements EventHandler<JobEvent>{
            @Override
            public void handle(JobEvent event) {
                if (event.getType() == JobEventType.JOB_KILL){
                    System.out.println("Received JOB_KILL event of job "  + event.getJobID());
                    System.out.println("Killing all tasks");
                    for(int i = 0; i < taskNummber; i++){
                        dispatcher.getEventHandler().handle(new TaskEvent(taskIDs[i], TaskEventType.T_KILL));
                    }
                }else if (event.getType() == JobEventType.JOB_INIT){
                    System.out.println("Received JOB_INIT event,scheduling tasks");
                    for(int i = 0; i < taskIDs.length; i++){
                        dispatcher.getEventHandler().handle(new TaskEvent(taskIDs[i], TaskEventType.T_SCHEDULE));
                    }
                }
            }
        }
    }

    public static void main(String[] args) {
        String jobID = "job_2014903_1";
        SimpleMRAppMaster mrAppMaster = new SimpleMRAppMaster(jobID,5);
        mrAppMaster.init();
        mrAppMaster.start();
        mrAppMaster.getDispatcher().getEventHandler().handle(new JobEvent(jobID, JobEventType.JOB_KILL));
        mrAppMaster.getDispatcher().getEventHandler().handle(new JobEvent(jobID, JobEventType.JOB_INIT));
    }
}
{% endhighlight %}

主函数中，生成了一个管理器，该管理器内部有一个异步派发器。初始化过程中，对Job以及Task类型注册了相应的处理器，然后启动。之后发送了两个Job事件。


在JobEventHandler中，该事件的处理是重新对每一个Task发送Task的事件。



EOF.