---
layout: page
title:	Java无锁队列与栈的实现 
description: "解决并发冲突，除了传统的互斥机制之外，还可以使用无锁机制。无锁机制是一种乐观的，解决并发情况下竞争的机制。本篇主要介绍Java无锁机制的使用，以及实现无锁的队列和栈。"
modified: 2014-01-16
tags: [java,并发,数据结构]
category:  Javadevelopment
imagefeature: abstract-19
comments: true
share: true
---

Java无锁队列与栈的实现 

>参考：《<a href = "http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.53.8674&rep=rep1&type=pdf">Implementing Lock-Free Queues</a>》。

尽管这篇文章讲的是无锁队列，但是引用《Java并发实践》中的一句话，并发环境下，首先应该保证正确性，其次才是性能。在没有证明现情况下性能确实需要提高，且锁机制无法满足的时候，才应该考虑无锁。确实，无锁实现的难度随着需求要求会迅速提高，相对于锁机制，难把控的多。

无锁的基础是`CAP`（Compare And Swap）操作,这是由硬件提供的。Java中，原子类型对这种机制进行了包装。

例如,i++，它由读取i值，i+1运算，写回新值三个操作组成，如果无法保证这三个操作整体的原子性，就可能出问题。使用CAP实现示例如下：

{% highlight java linenos %}
AtomicInteger i = new AtomicInteger(0);  
int oldValue;  
int newValue;  
do{  
     oldValue = i.get();  
     newValue = oldValue + 1;  
}while (!i.compareAndSet(oldValue,newValue));  
{% endhighlight %}


每一次循环都完成一次取值和加1操作，然后进行比较，如果当前旧值还没有改变，则更新，否者继续下一次尝试。在并发中，共享资源出现不一致的状态基本都是由于写依赖于读的操作，例如上面的i++,i的新值依赖于之前的旧值。而在不可更改的共享数据，或者更新不依赖于之前旧值的情况下是不会出现问题的，例如直接设值。要保证这种操作的正确性，就需要保证读与写整体的原子性，比如使用锁来保证。


而在无锁操作中，是无法阻止多个线程同时对共享资源进行更改，而采用的方式就是在写的时候进行验证。写操作采用CAP，该操作会比较当前值与提供的旧值，若当前值与旧值相等，这表示该线程上一次读之后没有其他线程对该资源进行更改，也就是该线程这一组运算之后的值是有效的，则将该值更新。


- 图1
<figure>
	<img src="/images/inpages/freelock1.png"/>
</figure>

例如，线程1需要对一个值进行+5操作，线程2需要对其进行+10操作，如图2。线程1先读取到值，并先写入值。如果没有采取任何措施，那么最终的结果将会是线程2的更新结果15，这显然不是我们想要的结果。采取CAP操作时，线程1比较当前值与旧值，都是5，则将值更新为10。线程2进行比较的时候，会发现值已经不是之前自己读取到的5，所以更新操作将失败，线程2将再一次回到起点，进行一次尝试，直到成功更新为止。


-图2
<figure>
	<img src="/images/inpages/freelock2.png"/>
</figure>


以下是无锁队列的实现代码。

{% highlight java linenos %}
package cn.yuanye.concurrence.LockFreeCollection;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * <p>A free lock queue,based on linked list </p>
 */
public class LockFreeQueue<V> {


    //the queue node
    private class Node<V> {
        public V value = null;
        public AtomicReference<Node<V>> next = null;

        public Node(V value, Node next) {
            this.value = value;
            this.next = new AtomicReference<Node<V>>(next);
        }
    }

    private AtomicReference<Node<V>> head = null;                                //queue head
    private AtomicReference<Node<V>> tail = null;                                //queue tail
    private AtomicInteger queueSize = new AtomicInteger(0);                      //size of the queue

    public LockFreeQueue(){
        Node<V> dummy = new Node<V>(null,null);                                  //init an dummy node

        //init head and tail,reference to  the same dummy node
        head = new AtomicReference<Node<V>>(dummy);
        tail = new AtomicReference<Node<V>>(dummy);
    }

    /**
     * <p>Add an value to the end of the queue</p>
     * <p>This method is based on CAP operation,and is thread safe.</p>
     * <p>It guarantee the value will eventually add into the queue</p>
     * @param value the value to be added into the queue
     */
    public void enQueue(V value) {
        Node<V> newNode = new Node<V>(value,null);
        Node<V> oldTail = null;
        while(true){
            oldTail = tail.get();
            AtomicReference<Node<V>> nextNode = oldTail.next;
            if(nextNode.compareAndSet(null,newNode)){
                break;
            }else{
                tail.compareAndSet(oldTail,oldTail.next.get());
            }
        }
        queueSize.getAndIncrement();
        tail.compareAndSet(oldTail,oldTail.next.get());
    }


    /**
     * <p>Get an Value from the queue</p>
     * <p>This method is based on CAP operation,thread safe</p>
     * <p>It guarantees return an value or null if queue is empty eventually</p>
     * @return value on the head of the queue,or null when queue is empty
     */
    public V deQueue() {
        while(true){
            Node<V> oldHead = head.get();
            Node<V> oldTail = tail.get();
            AtomicReference<Node<V>> next = oldHead.next;

            if(next.get() == null){
                return null;              ///queue is empty
            }

            if(oldHead == tail.get()){
                tail.compareAndSet(oldTail, oldTail.next.get());   //move the tail to last node
                continue;
            }

            if(head.compareAndSet(oldHead,oldHead.next.get())){
                queueSize.getAndDecrement();
                return oldHead.next.get().value;
            }
        }
    }

    /**
     * <p>Get the size of the stack</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return size of the stack
     */
    public int size() {
        return queueSize.get();
    }

    /**
     * <p>Check if the stack is empty</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return false unless stack is empty
     */
    public boolean isEmpty() {
        return queueSize.get() == 0;
    }

}
{% endhighlight %}

队列初始化时，头部和尾部指向了同一个节点，该节点不存储任何数据，仅仅是为了避免出栈和入栈操作作用于同一个节点上。 

如果这两个操作同时作用在一个节点上，就会出现问题。比如，线程A进行出栈操作，线程B进行入栈操作，当链只有一个节点时，这两个线程会引用到同一个节点，当线程A从链上获取到该节点后，线程B却是不知道的。B比较该节点的Next，因为没有其他节点进行入栈操作，那么B将成功的将新节点链接到该Next引用上，此时B以为自己成功的将新节点加入了队列中。而实际上，B线程将新节点加入到了一个已经不再栈内的节点末尾。




如下是栈的实现代码，相比队列要简单不少。


{% highlight java linenos %}
package cn.yuanye.concurrence.LockFreeCollection;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * <p>A free lock queue,based on linked list </p>
 */
public class LockFreeQueue<V> {


    //the queue node
    private class Node<V> {
        public V value = null;
        public AtomicReference<Node<V>> next = null;

        public Node(V value, Node next) {
            this.value = value;
            this.next = new AtomicReference<Node<V>>(next);
        }
    }

    private AtomicReference<Node<V>> head = null;                                //queue head
    private AtomicReference<Node<V>> tail = null;                                //queue tail
    private AtomicInteger queueSize = new AtomicInteger(0);                      //size of the queue

    public LockFreeQueue(){
        Node<V> dummy = new Node<V>(null,null);                                  //init an dummy node

        //init head and tail,reference to  the same dummy node
        head = new AtomicReference<Node<V>>(dummy);
        tail = new AtomicReference<Node<V>>(dummy);
    }

    /**
     * <p>Add an value to the end of the queue</p>
     * <p>This method is based on CAP operation,and is thread safe.</p>
     * <p>It guarantee the value will eventually add into the queue</p>
     * @param value the value to be added into the queue
     */
    public void enQueue(V value) {
        Node<V> newNode = new Node<V>(value,null);
        Node<V> oldTail = null;
        while(true){
            oldTail = tail.get();
            AtomicReference<Node<V>> nextNode = oldTail.next;
            if(nextNode.compareAndSet(null,newNode)){
                break;
            }else{
                tail.compareAndSet(oldTail,oldTail.next.get());
            }
        }
        queueSize.getAndIncrement();
        tail.compareAndSet(oldTail,oldTail.next.get());
    }


    /**
     * <p>Get an Value from the queue</p>
     * <p>This method is based on CAP operation,thread safe</p>
     * <p>It guarantees return an value or null if queue is empty eventually</p>
     * @return value on the head of the queue,or null when queue is empty
     */
    public V deQueue() {
        while(true){
            Node<V> oldHead = head.get();
            Node<V> oldTail = tail.get();
            AtomicReference<Node<V>> next = oldHead.next;

            if(next.get() == null){
                return null;              ///queue is empty
            }

            if(oldHead == tail.get()){
                tail.compareAndSet(oldTail, oldTail.next.get());   //move the tail to last node
                continue;
            }

            if(head.compareAndSet(oldHead,oldHead.next.get())){
                queueSize.getAndDecrement();
                return oldHead.next.get().value;
            }
        }
    }

    /**
     * <p>Get the size of the stack</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return size of the stack
     */
    public int size() {
        return queueSize.get();
    }

    /**
     * <p>Check if the stack is empty</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return false unless stack is empty
     */
    public boolean isEmpty() {
        return queueSize.get() == 0;
    }

}
{% endhighlight %}



附上简陋的测试代码。

队列的测试。

{% highlight java linenos %}
package cn.yuanye.concurrence.LockFreeCollection;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * <p>A free lock queue,based on linked list </p>
 */
public class LockFreeQueue<V> {


    //the queue node
    private class Node<V> {
        public V value = null;
        public AtomicReference<Node<V>> next = null;

        public Node(V value, Node next) {
            this.value = value;
            this.next = new AtomicReference<Node<V>>(next);
        }
    }

    private AtomicReference<Node<V>> head = null;                                //queue head
    private AtomicReference<Node<V>> tail = null;                                //queue tail
    private AtomicInteger queueSize = new AtomicInteger(0);                      //size of the queue

    public LockFreeQueue(){
        Node<V> dummy = new Node<V>(null,null);                                  //init an dummy node

        //init head and tail,reference to  the same dummy node
        head = new AtomicReference<Node<V>>(dummy);
        tail = new AtomicReference<Node<V>>(dummy);
    }

    /**
     * <p>Add an value to the end of the queue</p>
     * <p>This method is based on CAP operation,and is thread safe.</p>
     * <p>It guarantee the value will eventually add into the queue</p>
     * @param value the value to be added into the queue
     */
    public void enQueue(V value) {
        Node<V> newNode = new Node<V>(value,null);
        Node<V> oldTail = null;
        while(true){
            oldTail = tail.get();
            AtomicReference<Node<V>> nextNode = oldTail.next;
            if(nextNode.compareAndSet(null,newNode)){
                break;
            }else{
                tail.compareAndSet(oldTail,oldTail.next.get());
            }
        }
        queueSize.getAndIncrement();
        tail.compareAndSet(oldTail,oldTail.next.get());
    }


    /**
     * <p>Get an Value from the queue</p>
     * <p>This method is based on CAP operation,thread safe</p>
     * <p>It guarantees return an value or null if queue is empty eventually</p>
     * @return value on the head of the queue,or null when queue is empty
     */
    public V deQueue() {
        while(true){
            Node<V> oldHead = head.get();
            Node<V> oldTail = tail.get();
            AtomicReference<Node<V>> next = oldHead.next;

            if(next.get() == null){
                return null;              ///queue is empty
            }

            if(oldHead == tail.get()){
                tail.compareAndSet(oldTail, oldTail.next.get());   //move the tail to last node
                continue;
            }

            if(head.compareAndSet(oldHead,oldHead.next.get())){
                queueSize.getAndDecrement();
                return oldHead.next.get().value;
            }
        }
    }

    /**
     * <p>Get the size of the stack</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return size of the stack
     */
    public int size() {
        return queueSize.get();
    }

    /**
     * <p>Check if the stack is empty</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return false unless stack is empty
     */
    public boolean isEmpty() {
        return queueSize.get() == 0;
    }

}
{% endhighlight %}


栈的测试。 

{% highlight java linenos %}
package cn.yuanye.concurrence.LockFreeCollection;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * <p>A free lock queue,based on linked list </p>
 */
public class LockFreeQueue<V> {


    //the queue node
    private class Node<V> {
        public V value = null;
        public AtomicReference<Node<V>> next = null;

        public Node(V value, Node next) {
            this.value = value;
            this.next = new AtomicReference<Node<V>>(next);
        }
    }

    private AtomicReference<Node<V>> head = null;                                //queue head
    private AtomicReference<Node<V>> tail = null;                                //queue tail
    private AtomicInteger queueSize = new AtomicInteger(0);                      //size of the queue

    public LockFreeQueue(){
        Node<V> dummy = new Node<V>(null,null);                                  //init an dummy node

        //init head and tail,reference to  the same dummy node
        head = new AtomicReference<Node<V>>(dummy);
        tail = new AtomicReference<Node<V>>(dummy);
    }

    /**
     * <p>Add an value to the end of the queue</p>
     * <p>This method is based on CAP operation,and is thread safe.</p>
     * <p>It guarantee the value will eventually add into the queue</p>
     * @param value the value to be added into the queue
     */
    public void enQueue(V value) {
        Node<V> newNode = new Node<V>(value,null);
        Node<V> oldTail = null;
        while(true){
            oldTail = tail.get();
            AtomicReference<Node<V>> nextNode = oldTail.next;
            if(nextNode.compareAndSet(null,newNode)){
                break;
            }else{
                tail.compareAndSet(oldTail,oldTail.next.get());
            }
        }
        queueSize.getAndIncrement();
        tail.compareAndSet(oldTail,oldTail.next.get());
    }


    /**
     * <p>Get an Value from the queue</p>
     * <p>This method is based on CAP operation,thread safe</p>
     * <p>It guarantees return an value or null if queue is empty eventually</p>
     * @return value on the head of the queue,or null when queue is empty
     */
    public V deQueue() {
        while(true){
            Node<V> oldHead = head.get();
            Node<V> oldTail = tail.get();
            AtomicReference<Node<V>> next = oldHead.next;

            if(next.get() == null){
                return null;              ///queue is empty
            }

            if(oldHead == tail.get()){
                tail.compareAndSet(oldTail, oldTail.next.get());   //move the tail to last node
                continue;
            }

            if(head.compareAndSet(oldHead,oldHead.next.get())){
                queueSize.getAndDecrement();
                return oldHead.next.get().value;
            }
        }
    }

    /**
     * <p>Get the size of the stack</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return size of the stack
     */
    public int size() {
        return queueSize.get();
    }

    /**
     * <p>Check if the stack is empty</p>
     * <p>This method doesn't reflect timely state when used in concurrency environment</p>
     * @return false unless stack is empty
     */
    public boolean isEmpty() {
        return queueSize.get() == 0;
    }

}
{% endhighlight %}

