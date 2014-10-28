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

在分布式环境下，存在各种形式的协调服务需求，例如系统配置、选举以及分布式锁服务。解决这些问题，可以针对每一个应用场景，开发一套协调服务系统，例如Amazon Simple Queue Service关注排队问题，Chubby关注与锁服务。而Zookeeper剥离了这些具体的协调原语，而选择提供一组API，让应用去实现所需的服务原语。

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

## Data Model

Zookeeper数据模型为一个简单的文件系统，仅支持数据的完全读写操作，以及以Key层级组织的Key/Value表。

<figure><img src="/images/zookeeper/datamodel.png"/></figure>

图中的节点称为***`znode`***,是客户端通过API直接操作的数据对象。与通用的文件系统不同的是，znode并不是用于通用数据存储，而是用于映射客户端应用先关的抽象概念，一般与协助服务使用的元数据一致。如上图，有两棵子树，分别用于app1(app1)和app2（/app2）。App1的子树实现了一个简单的组成员管理协议：每一个客户端进程pi在/app1子树下创建一个znode p_i,该节点在pi运行期间一直存在。当然，Zookeeper也允许客户端存储一些元数据或配置信息等。

Zookeeper中，有两种类型的znode:
	
- 1.Regualr - 由客户端直接创建以及删除
- 2.Ephemeral - 由客户端创建，但是可以由客户端删除，亦可以由Zookeeper在回话超时时自动删除。

另外，客户端创建znode时还可以指定*sequential*标志，使得创建的节点的名称之后自动追加一个递增的数字。例如，如果n是在p子树下创建的一个新节点，那么n的序号不会小于任何在p下已经创建的节点的序号。

## API

如下是Zookeeper提供的主要API:

- **create(path,data,flags)** - 创建一个路径为path的znode，并以data数据进行填充。flags使得客户端可以选择znode的类型以及是否使用sequential选项。
- **delete(path,version)** - 删除指定版本的znode。
- **exists(path,watch)** - 判断指定路径的znode是否存在。watch用于设置是否在该路径上设置watch服务。
- **getData(path,watch)** - 返回指定路径的znode信息，包括版本，元数据，数据等。
- **setData(path,data,version)** - 若当前znode的版本匹配，则设置其数据为data。
- **getChildren(path,watch)** - 返回自定路径下的所有znode集合。
- **sync(path)** - 等待该操作前的所有更新操作传播到调用该方法的客户端连接的服务器上。一般现调用sync，然后调用read,该read操作将保证读取到sync之前所有更新操作的最新结果。该方法用于得到全局一致性。

## Examples of primitives

### Configuration Management

Zookeeper可以用于实现分布式应用的动态配置管理。

最简单的实现为分布式应用启动时，使用watch服务读取指定的znode。一旦该znode被更新，每一个应用都能得到通知，然后根据znode数据，更新自己的配置信息。

如本例一样，大多数情况下watch服务仅仅用于保障客户端能够得知最新的信息。例如，若存在进程pi对znode z设置watch服务。若z得到更新，Zookeeper将会向pi发送更新通知，但若在pi再次读取z信息之前，z又被更新了两次，此时，pi不会再获得两个更新通知。

### Rendezvous

在分布式情况下，系统的最终配置情况并不事先都知道。例如，某客户端要启动一个master进程以及多个workder进程，但由于调度器等原因，worker进程无法事先获得master的地址、端口等信息 ，从而无法与master建立连接。在这种情况下，我们可以给每一个workder进程传递一个znode的路径信息，master启动时，将自身信息写入该znode中，workder从该znode中读取到master的相关信息，从而与其建立连接。而在master尚未启动之前，worker可以使用watch服务对该znode进行监听，一旦该znode信息更新，能够及时的获取。并且，若该znode为ephemeral类型，master和workder进程可以watch该节点，一旦其被删除，则清理自身资源并退出。

### Group Membership

通过利用ephmeral节点的特定，可以利用Zookeeper实现用户组成员管理。

我们可以用一个znode来指定一个组，当该组成员启动时，将在该组节点子树下创建一个ephemeral类型的znode。组成员创建该节点之后，无需再做任何事情，因为若该成员失败或者退出，其创建的znode将会被自动删除。而想要获取某一组的所有成员，只需要列举出组znode下所有的znode即可。

### Simple Locks

可以使用指定的znode表示锁，若该节点存在，则表示当前无法获得锁，若不存在，则可以获得。只要创建该znode成功，则表示加锁成功。解锁只需要删除该znode即可。

但是该方法的问题在于，加锁时所有客户端都将尝试创建该znode，但只有一个客户端能够成功。在集群规模大的时候，问题将更加严重。

### Simple Lock without Herb Effect

{% highlight shell %}
Lock
	n = create(l + “/lock-”, EPHEMERAL|SEQUENTIAL)
	C = getChildren(l, false)
	if n is lowest znode in C, exit
	p = znode in C ordered just before n
	if exists(p, true) wait for watch event
	goto 2
Unlock
	delete(n)
{% endhighlight %}

该种方式有如下好处:
- 1.znode的删除只会唤醒一个客户端，从而避免的羊群效应(herb effect).
- 2.不存在轮休或者超时。
- 3.可以通过查看Zookeeper数据，获知锁的数量，解锁以及debug等。


### Read/Write Lock

**Write Lock**
{% highlight shell %}
n = create(l + “/write-”, EPHEMERAL|SEQUENTIAL)
C = getChildren(l, false)
if n is lowest znode in C, exit
p = znode in C ordered just before n
if exists(p, true) wait for event
goto 2
{% endhighlight %}

**Read Lock**
{% highlight shell %}
n = create(l + “/read-”, EPHEMERAL|SEQUENTIAL)
C = getChildren(l, false)
if no write znodes lower than n in C, exit
p = write znode in C ordered just before n
if exists(p, true) wait for event
goto 3
{% endhighlight %}

