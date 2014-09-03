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
<img src="/images/event-driven/basic.jpg"/>

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
对于派发器，可以做的很简单。甚至一个Map就可以实现。这种情况下，只是动态的获取了事件的处理器，但是处理该事件的过程仍然是在发起事件的线程中执行。
在一个大的系统中，一个事件的处理很可能需要很多步骤，处理事件也很长。此时，同步的派发器将带来不可接受的性能。

异步派发器即拥有自己的处理线程，新事件得到时，仅仅将该事件放在待处理事件堆中，该调用即可返回，而后续的事件处理将会有处理线程来进行。
如下是异步派发器的简单示意图：
EOF.