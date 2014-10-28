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

但如此又出现一个新问题，即可能存在多个Proposal在几乎同时发起提议，使得很难达成

