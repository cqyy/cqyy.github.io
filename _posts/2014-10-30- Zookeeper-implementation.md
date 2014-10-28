---
layout: post
title: Paxos与Zookeeper实现
description: "The Paxos Consensus Algorithm and the implementation of Zookeeper"
modified: 2014-10-30
tags: [分布式]
imagefeature: cs-11.jpg
category: Distributed
comments: true
share: true
---

Paper:《<a href="https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf">ZooKeeper: Wait-free coordination for Internet-scale systems</a>》

Paper:《<a href="http://research.microsoft.com/en-us/um/people/lamport/pubs/paxos-simple.pdf">Paxos made simple</a>》


## Paxos Consensus Algorithm

Paxos是用于处理分布式情况下，基于消息传递的一种一致性算法，由Leslie Lamport与1990年提出。

### The Problem

假定存在一组进程，它们各自都能`提议`某一个值，需要有一个一致性算法来保证在这些提议的值中，只会有一个值能够`通过`。若没有哪一个进程提议了值，那么也不会存在一个通过的值。也就是说最终通过的值一定是有某一个进程提议出来的，不会凭空出现。并且，一旦一个值得到了通过，那么所有的进程都能通过某种方法获知该值。

所以对于一致性算法，就有如下三个安全要求：

- 通过的值，一定是提议出来的
- 提议出来的值，只会有一个能够通过
- 进程获知到的值，一定是通过的

对此，可以有如下三类角色：提议者（Proposer),接受者（Accepter),学习者（Learner)。Proposer提议值，Accepter接受通过的值并存储，学习者通过某种方式从Acceptor获知通过的值。而对于某一进程，它可以通知担任多个角色。

并且任意角色之间都能通过发送消息进行通信，并且通信过程中不存在拜占庭错误（即消息被篡改的问题）。并且有：

- 任意角色允许以任意速度进行，可以停止，可以重启。
- 角色之间的消息可以传输任意长的时间，可以重复发送，可以丢失，但不能被篡改。

### Choosing a value

选值是指在众多提议的值中，选择一个值，并保证该值能够被Learner正确的获取到。

对于只有一个Acceptor情况下，该Acceptor只选择第一个到达的提议值即可满足要求，但却无法实现高可靠性。为了实现高可靠性，Paxos采取多个Acceptor的办法，存储多个提议值的副本，避免了单点故障问题。对于某一个提议，Proposer将自己的提议值发送给每一个Acceptor，Acceptor可以选择接受或者拒绝。只有当`大多数`Acceptor接受该值时，便可以认为该值得到`通过`,也就是最终选择了该值。其中，大多是指超过半数的Acceptors。

这种选择方式，Learner能够通过获取所有Acceptor对于该提议的值，选择大多数Acceptor接受的值即可。而为了使得这种方式可行，则需要满足如下要求任意Acceptor对于某一个提议最多接受一个值。因为对于任意的大多数集合，至少有一个共同的Acceptor。并且，要使得在只有一个Proposer情况下，提议也能通过，则必须满足要求：

> **P1** - 任何Acceptor必须接受它收到的第一个提议值。

但如此又出现一个新问题，即可能存在多个Proposer在几乎同时发起提议，使得任何一个值都无法得到大多数Acceptor的接受。所以，就需要Acceptor能够接受多个提议值。为了标志每一个提议，不至于混乱，给每一个提议都附加一个唯一的编号。而一旦Acceptor可以接受多个值，为了使得Leaner能够正确的获得提议值，只需要保证所有被接受的提议有相同的值即可。所以，有：

> **P2** - 若通过了一个值为v的提议，则任何通过的、拥有更高编号的提议值也为v。

故，只要满足P1和P2，就能使得一致性算法的三个要求得到满足。

又由于任何一个得到通过的提议，至少会被一个Acceptor接受，故通过如下要求即可满足P2：

> **P2a** - 若通过了一个值为v的提议，则任何Acceptor接受的任何拥有更高编号的提议的值都为v。

对于Acceptor，它并不知道其他Acceptor接受到得值，故只有对Proposer进行约束，才能同时满足P2a和P1。例如，存在一个尚未接受过任何提议的Acceptor，另有一个由于某些原因停止，然后重启的Proposer发出了一个更高编号但值不一致的提议。按照P1，该Acceptor将接受该值，但是如此又将违背P2a。所以，通过如下对P2a的约束加强:

> **P2b** - 若通过了一个值为v的提议，则任何Proposer发布的编号更高的提议值都为v。

而由于任意的大多是集合都至少会有一个共有的Acceptor，可以通过如下约束满足p2b：

> **P2c** - 对于任意v和n,若发布了一个编号为n，值为v的提议，就存在一个大多数Acceptor集合，要么a)该集合中所有Acceptor尚未接受过任何编号比n小的提议，要么b)v为该集合中编号最大但小于n的提议的值。

P2c给出了满足P2b的一个具体的实现要求。要满足P2c，Proposer在发布提议前，就需要对当前Acceptor状态进行分析，以决定发布提议的值。

Paxos通过如下算法满足要求：

* 1.Proposer首先选择一个提议编号n,并向所有Acceptor发送`prepare`请求，Acceptor回复：
	* a)承诺不再接受任何编号小于n的提议
	* b)若曾经接受过比编号比n小的提议，回复这些提议中编号最大的提议
* 2.若Proposer接受到了大多数Acceptor的回复，则发布编号为n的提议。若Acceptor回复之前没有接受过提议，则该提议的值为该Proposer选择的值，否则为之前通过的，编号小于n中最大提议的值。

上述为Proposer的算法，Acceptor算法如下：

> **P1a** - Acceptor接受一个编号为n的提议，当前仅当其没有回复过编号大于n的prepare请求。

综上，Paxos算法有如下两个阶段组成：

- **Phase 1** 
	- a）Proposer选择一个提议编号，并向一个Acceptor大多是集合发送prepare请求
	- b) 若Acceptor接受到一个编号比之前接收到的任何Prepare编号都打得请求，则向Proposer回复，并保证不再接受任何编号小于n的提议。

- **Phase 2**
	- a)若Proposer接受到来自大多数Acceptor的回复，则根据回复决定最终发布提议的值并发布提议。
	- b)若Acceptor接收到一个提议，只要尚未回复过编号比该提议大的prepare请求，则接受该值。

### Learning A Chosen Value

最简单的办法就是向所有Acceptor发送请求，根据回复内容选择大多是Acceptor的值即可。

## Zookeeper Implementation

![Component of Zookeeper](/images/zookeeper/component.jpg)

Zookeeper通过副本数据库，在多个节点中保持相同的数据来提供高可靠性的服务。总体上，Zookeeper由以上三个组件构成。Server一收到请求，就会立即开始处理。对于需要协助的操作（Write），将使用一个一致性协议，最终操作的变化将在集群的各个数据库中提交。对于read操作，将由客户端连接到的Server进行处理。

副本数据库采用纯内存方式，并且定义快照并存储磁盘。

Zookeeper中每一个Server都能提供服务，Client只需要连接到其中任意一个Server节点即可。

在算法上，Zookeeper对Paxos算法进行了简化，采用单Proposer以及本地读方式，牺牲了一定的一致性而获取高读性能。在Zookeeper中，每一个Server都充当Paxos中的Acceptor以及Learner角色，称为`follower`，并通过算法动态的选举一个Server充当Proposer,称为`Leader`。所有的write请求都将发送到Leader节点进行协调处理，而follower将接受来自Client的请求，处理并同意来自Leader的状态变更请求。

### Request Process

尽管在某些时刻，一些Server会比其他Server处理更多的事务，但是Zookeeper必须保证各个Server的副本数据不会产生分歧。与客户端的操作不同，这里的事务是幂等的。Leader一旦收到读请求，将计算该操作完成后，系统的状态，并附加上新版本号以及时间戳等信息，经过有效性验证后形成事务。

>幂等 - 在分布式系统中，幂等转换指一个操作可以重复多次，而不会对结果产生影响。

### Atomic Broadcast

Leader执行完write操作后，会将新状态变化通过Atomic Broadcast发送给其他的Server。Zab使用了简单的大多是仲裁方式，所以Zab只有在大多数Server正确时才能正常工作（例如2f+1个节点的集群，至少需要f+1个节点状态正常）。

### Replicated Database

由于副本数据库为纯内存模式，使得在Server恢复时需要将所有的事务重做，浪费时间。故Server将会定期的执行快照，将结果存储到磁盘，以便于快速恢复。在快照过程中，并不需要对这个数据库冻结，只需要逐步复制出数据库结果即可。该种方式会使得快照中的数据出现不一致情况，但是由于Zookeeper事务的幂等性，将快照开始时刻之后的事务重做，将会得到一致的结果。

### Client-Server Interaction

对于Read操作以及通知服务，Server进行本地化处理，即不会将该操作广播。对于Write操作，Server将顺序性的处理，并且Write和Read操作不会并发执行。这保证了顺序一致性。

对于每一个写操作，都将附加一个顺序号`zxid`，该顺序号对应于该服务器最近感知到的事务。该顺序号标志了各个Server状态的新旧情况。由于使用的本地处理方式，read操作不需要进行广播即可处理返回，使得该操作性能极好。但是，这种方式也可能导致读取到过期数据。例如Client A写入了一个新值，并立即通知B进行读取。此时，A写入的新值必然在大多是Server上已经成功更新，但是却可能存在一个尚未接收到给更新的Server(由于网络延迟等原因），而B正好连接到了这样的一台Server上。这就会使得B读取到一个最近更新之前的老旧数据。

对于大多是的应用来说，这不关紧要，因为大多数应用不需要如此严苛的一致性要求。但是对于这样严苛的要求，Zookeeper也可以满足。在Read操作前调用一次sync操作，即可保证read能够读取到在sync操作之前的所有write操作的结果。sync操作并不需要广播，只需要在该Server的处理队列中合适位置放入sync即可。由于事务的顺序性，一旦该sync操作得到了Leader的处理回复，即可保证sync之前的所有write事务已经被当前Server收到，也就保证了read能够读取到最新数据。

在Client首次与Server建立连接时，需要给出Client的zxid。Server需要通过该id判断自身数据是否不比Client端的老旧。若Server自身zxid小于客户端的zxid，则拒绝此次连接。该方式保证了客户端不会读取到时光倒流的数据（比当前自己数据版本老旧的数据）。



**EOF**