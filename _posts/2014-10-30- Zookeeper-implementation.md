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

- 任意角色允许以任意速度进行，可以通知，可以重启。
- 角色之间的消息可以传输任意长的时间，可以重复发送，可以丢失，但不能被篡改。

### Choosing a value

选值即是在众多提议的值中，选值一个值，并保证该值能够被Learner正确的获取到。

对于只有一个Acceptor情况下，该Acceptor只选择第一个到达的提议值即可满足要求，但却无法实现高可靠性。为了实现高可靠性，Paxos采取多个Acceptor的办法，存储多个提议值的副本，避免了单点故障问题。对于某一个提议，Proposer将自己的提议值发送给每一个Acceptor，Acceptor可以选择接受或者拒绝。只有当`大多数`Acceptor接受该值时，便可以认为该值得到`通过`,也就是最终选择了该值。其中，大多是指超过半数的Acceptors。

这种选择方式，Learner能够通过获取所有Acceptor对于该提议的值，选择大多数Acceptor接受的值即可。而为了使得这种方式可行，则需要满足如下要求任意Acceptor对于某一个提议最多接受一个值。因为对于任意的大多数集合，至少有一个共同的Acceptor。并且，要使得在只有一个Proposal情况下，提议也能通过，则必须满足要求：

> **P1** - 任何Acceptor必须接受它收到的第一个提议值。

但如此又出现一个新问题，即可能存在多个Proposal在几乎同时发起提议，使得任何一个值都无法得到大多是Acceptor的接受。所以，就需要Acceptor能够接受多个提议值。为了标志每一个提议，不至于混乱，给每一个提议都附加一个唯一的数字。而一旦Acceptor可以接受多个值，为了使得Leaner能够正确的获得提议值，只需要保证所有被接受的提议有相同的值即可。所以，有：

> **P2** - 若通过了一个值为v的提议，则任何通过的、拥有更高编号的提议值也为v。

故，只要满足P1和P2，就能使得一致性算法的三个要求得到满足。

又由于任何一个得到通过的提议，至少会被一个Acceptor接受，故通过如下要求即可满足P2：

> **P2a** - 若通过了一个值为v的提议，则任何Acceptor接受的任何拥有更高编号的提议的值都为v。

对于Acceptor，它并不知道其他Acceptor接受到得值，故只有对Proposal进行约束，才能同时满足P2a和P1。例如，存在一个尚未接受过任何提议Acceptor，另有一个由于某些原因停止，然后重启的Proposal发出了一个更高编号但值不一致的提议。按照P1，该Acceptor将接受该值，但是如此又将违背P2a。所以，通过如下对P2a的约束加强:

> **P2b** - 若通过了一个值为v的提议，则任何Proposal发布的编号更高的提议值都为v。

而由于任意的大多是集合都至少会有一个共有的Acceptor，可以通过如下约束满足p2b：

> **P2c** - 对于任意v和n,若发布了一个编号为n，值为v的提议，就存在一个大多数Acceptor集合，要么a)该集合中所有Acceptor尚未接受过任何编号比n小的提议，要么b)v为该集合中编号最大但小于n的提议的值。

P2c给出了满足P2b的一个具体的实现要求。要满足P2c，Proposal在发布提议前，就需要对当前Acceptor状态进行分析，以决定发布提议的值。

Paxos通过如下算法满足要求：

* 1.Proposal首先选择一个提议编号n,并向所有Acceptor发送`prepare`请求，Acceptor回复：
	* a)承诺不再接受任何编号小于n的提议
	* b)若曾经接受过比编号比n小的提议，回复这些提议中编号最大的提议
* 2.若Proposal接受到了大多数Acceptor的回复，则发布编号为n的提议。若Acceptor回复之前没有接受过提议，则该提议的值为该Proposal选择的值，否则为之前通过的，编号小于n中最大提议的值。

上述为Proposal的算法，Acceptor算法如下：

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

