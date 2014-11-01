---
layout: post
title: KafKa简介
description: "A brief introduction to Kafka"
modified: 2014-11-1
tags: [分布式]
imagefeature: cs-12.jpg
category: Distributed
comments: true
share: true
---

Paper:《<a href="http://research.microsoft.com/en-us/um/people/srikanth/netdb11/netdb11papers/netdb11-final12.pdf">Kafka: a Distributed Messaging System for Log Processing</a>》

## 介绍

Kafka是由Apache开发的，以统一、低延迟、高吞吐量为目标的分布式消息中间件。与其他的消息中间件相比，Kafka更关注于高吞吐量，而选择牺牲一定的数据传输可靠性，允许数据丢失。

## 基本架构

![architercure](/images/kafka/architecture.jpg "architecture")

首先，Kafka将传输的数据按类型进行分类，称为`topic`。`Producer`可以往某个topic发送消息，`broker`接受消息并缓存。`Consumer`可以订阅消息类型，并通过pull方式从各个Broker获取订阅topic的消息。

Kafka中个，Consumer由Consumer Group进行组织，一个Consumer属于一个组，组内各个Consumer拥有相同的订阅topic。每个topic进一步进行分割，形成`partition`。Producer可以将消息发往某一个随机或者某种方式决定的partition中，每个partition的消息只会由一个Consumer获取。不同的Consumer Group间，不需要协调而各种可以消费所有topic的消息。

Kafka存储使用了一种简单却有效的方式。每一个partition对应于一组逻辑日志，而每一个逻辑日志物理上由一组大小相同（一般1G)的分片文件组成。Producer往某一个Partition发送某条消息，broker首先将其缓存到内存中，并等待一定时间或者缓存消息数量达到一定限度时，再把消息以追加的方式追加到分片文件上。消息只有在刷入磁盘后，才会对Consumer可用。通过分片文件中的逻辑偏移量对消息进行寻址。

![log](/images/kafka/kafka_log.png "log")

各个Broker在内存中，通过一个有序偏移量列表，维护各个消息逻辑偏移到物理文件的映射。该偏移量表中，记录每一个分片文件第一条消息的逻辑偏移量。Consumer进行读取时，需要将读取的开始偏移量以及读取的数据量包含在pull请求中，broker根据偏移量索引逐步找到物理文件并读取消息消息返回，Consumer收取到该消息之后，将计算出下一次读取时的偏移量，并由于下一次的pull请求中。

## 协作

Kafka使用Zookeeper进行各个角色的协作，避免的单点问题。Kafka使用Zookeeper主要在三个方面：

- 1.探测Broker和Consumer的添加以及删除
- 2.触发负载调整
- 3.维护消费映射关系以及各个partition的消费位移关系

![data structure](/images/kafka/ds.jpg)

当Consumer或者Broker启动时，需要在Zookeeper对应目录(consumer为图中的*/consumer/[groupID]/IDs* ）下创建一个Consumer registry或Broker registry实体。在Broker registry(例 */Brokers/IDs/ID_1* ）中，记录了该Broker的host以及端口，存储的topic以及partition。在Consumer registry中(例 */Consumers/groupid_1/IDs/ID_1*)中，记录了其订阅的topic，并通过路径即可知道其所属的组。Ownership Registry(例*/Consumer/GroupID/owners/Topic_1*)中，记录了当前Consumer Group对各个Partition消息消费的偏移量。途中紫色为persistent类型节点，橘黄色为ephemeral类型节点。每个Consumer对所有的Broker以及Consumer进行监控，一旦发现变化，就进行负载调整。

对于消息的类型，是由Consumer确定的，Producer发送消息时，首先计算消息的partition，然后根据Zookeeper记录，发送到指定的Broker中。

负载调整的算法如下：

>
>rebalance process for consumer Ci in group G For each topic T that Ci subscribes to {
>
- remove partitions owned by Ci from the ownership registry
- read the broker and the consumer registries from Zookeeper
- compute PT = partitions available in all brokers under topic T
- compute CT = all consumers in G that subscribe to topic T
- sort PT and CT
- let j be the index position of Ci in CT and let N = |PT|/|CT|
- assign partitions from j*N to (j+1)*N - 1 in PT to consumer Ci
- for each assigned partition p 
{
	- set the owner of p to Ci in the ownership registry
	- let O
	- p = the offset of partition p stored in the offset registry
	- invoke a thread to pull data in partition p from offset Op
	}

}

算法首先删除当前Consumer的partition信息，然后读取所有的每一个topic的Partition以及Consumer信息，计算出该topic各个Consumer平均的Partition数量N。之后将partition平均分成N份，分配一份给当前Consumer，并修改Zookeeper中的记录信息。重复知道处理完所有Consumer。

## 使用Demo

### Producer

{% highlight java %}

import java.util.*;
 
import kafka.javaapi.producer.Producer;
import kafka.producer.KeyedMessage;
import kafka.producer.ProducerConfig;
 
public class TestProducer {
    public static void main(String[] args) {
        long events = Long.parseLong(args[0]);
        Random rnd = new Random();
 
        Properties props = new Properties();
        props.put("metadata.broker.list", "broker1:9092,broker2:9092 ");
        props.put("serializer.class", "kafka.serializer.StringEncoder");
        props.put("partitioner.class", "example.producer.SimplePartitioner");
        props.put("request.required.acks", "1");
 
        ProducerConfig config = new ProducerConfig(props);
 
        Producer<String, String> producer = new Producer<String, String>(config);
 
        for (long nEvents = 0; nEvents < events; nEvents++) { 
               long runtime = new Date().getTime();  
               String ip = “192.168.2.” + rnd.nextInt(255); 
               String msg = runtime + “,www.example.com,” + ip; 
               KeyedMessage<String, String> data = new KeyedMessage<String, String>("page_visits", ip, msg);
               producer.send(data);
        }
        producer.close();
    }
}
{% endhighlight %}

首先，Producer需要进行一些配置设置：

- metadata.broker.list - broker地址，至少两个（在Broker崩溃时进行切换）。
- serializer.class - 消息的序列化工具
- partitioner.class - 消息的分区方式
- request.required.acks -若Producer想在消息被成功接收后获取确认消息，可以设置该标志

然后，初始化一个Producer对象。Producer为泛型，分别为partition key类型以及消息类型。之后不断的产生消息并发送。KeyedMessage需要三个参数，分别为消息的topic，partition key以及消息内容。

### Partitioning 

{% highlight java %}
import kafka.producer.Partitioner;
import kafka.utils.VerifiableProperties;
 
public class SimplePartitioner implements Partitioner {
    public SimplePartitioner (VerifiableProperties props) {
 
    }
 
    public int partition(Object key, int a_numPartitions) {
        int partition = 0;
        String stringKey = (String) key;
        int offset = stringKey.lastIndexOf('.');
        if (offset > 0) {
           partition = Integer.parseInt( stringKey.substring(offset+1)) % a_numPartitions;
        }
       return partition;
  }
 
}
{% endhighlight %}

分割函数简单通过partition key某尾数字对partition总数取余即可。


**EOF**