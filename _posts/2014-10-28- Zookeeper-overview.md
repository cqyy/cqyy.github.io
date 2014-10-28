---
layout: post
title: Zookeeper 简介
description: "Zookeeper Overview"
modified: 2014-10-28
tags: [分布式]
imagefeature: cs-11.jpg
category: Distributed
comments: true
share: true
---

Paper:《<a href="https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf">ZooKeeper: Wait-free coordination for Internet-scale systems</a>》



## Introduction

Zookeeper是一个高性能、高可靠性以及可扩展的分布式协调服务。

在分布式环境下，存在各种形式的协调服务需求，例如系统配置、选举以及分布式锁服务。解决这些问题，可以针对每一个应用场景，开发一套协调服务系统，例如Amazon Simple Queue Service关注派对问题，Chubby关注与锁服务。而Zookeeper剥离了这些具体的协调原语，而选择提供一组API，让应用去实现所需的服务原语。

<figure><img src="/images/zookeeper/architecture.png"/></figure>

Zookeeper由多个Server组成，通过副本实现高可靠性和高性能。Zookeeper可以支持上千台规模集群的各种协调服务，并保证FIFO的客户操作顺序以及全局的顺序一致性。

Zookeeper还提供了Watch服务，使得客户端可以对数据进行缓存，并在数据更新时得到通知，以更新缓存数据。

## Consistency Guarantees

- **Sequential Consistency** - 对于各客户端，更新操作将以客户端发出的顺序执行。

- **Atomicity** - 更新操作要么成功，要么失败，不存在中间状态（即不存在部分更新的结果）。

- **Single System Image** - 无论客户端连接到哪一个Zookeeper服务，它都将看到相同的服务视图。

- **Reliability** - 一旦更新操作完成，它的结果将持久的存在，直到被更新。该特性有如下两个推理：
	- 1.只要客户端收到了更新成功标志，该更新操作将已经成功提交。但是，由于某些原因（网络故障，超时等等），客户端可能无法收到成功标志。
	- 2.对于每一个客户端，它永远不会读取到回滚的数据（即不会读取到比其之前读取的更老的数据）。

- **Timeliness** - 系统对任意客户端的视图都能在一时间范围内更新到最新状态。在该范围内，客户端能看到系统的状态变化，或者发现系统故障。

通过这些一致性保证，应用能够很容易的实现例如选举、栅栏、队列以及读写互斥锁等高层功能。

但是，Zookeeper并不保证如下一致性：

***Simultaneously Consistent Cross-Client Views***  ZooKeeper并不保证系统视图对所有客户端在任意时刻都一致。考虑如下场景：有两个客户端A和B，A将znode/a从0设置为1，并通知B，B执行读取操作有可能会读取到之前的旧值0。若需要A和B都同时能读取到最新值，需要在读取操作前调用
sync()方法。

所以ZooKeeper本身并不保证所有Server的数据同步更新，但是可以使用Zookeeper提供的API实现这样的功能。