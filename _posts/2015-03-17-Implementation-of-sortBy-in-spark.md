---
layout: post
title: 分布式排序实现
description: "The implementation of sortBy in SPARK"
modified: 2015-03-17
tags: [YARN]
imagefeature: cs-12.jpg
category: Distributed
comments: true
share: true
---


## 一些闲话

常用的排序算法有冒泡、快排等，这些算法都是针对需要处理的数据集比较小，能够全部放入内存进行操作的情况。在数据量稍大时，可以采用外部排序，一部分数据放入内存，剩下的存在磁盘中。

但是，单机瓶颈是没法避免的。若需要处理的的数据量超过了单机的能力，或者需要能更快的对大量数据进行排序时，分布式变成唯一选择（排除买得起大型机的土豪）。

分布式下，需要对数据进行分片，存储到多个节点上去，每个节点只负责其中的几片数据的处理。

如下为MapReduce下WordCount的工作示例图。

![WordCount in MR](/images/sortby/wordcount.png "WordCount in MR")

如图，首先输入文件被按行切分，然后map操作提取一行中的单词，再通过shuffle，将结果送到reduce端，最终得到全局的wordcount。
这里的关键问题是map端生成的局部wordcount结果如何分片送到reduce端，使得reduce端统计出的wordcount结果为全局的。
要解决这个问题，只需要解决对于任意单词，只会在reduce端的一个节点出现，即可解决该问题。故MapReduce中，在map端使用hash方式进行切分，这样就使得各个mapper之间达成了一协议。例如对于Apple这个单词，各个mapper都使用hash方式将该单词对于到reducer端，故所有的mapper都将该单词信息送到了的一个reducer端。

WordCount示例中，各个单词之间没有制约关系，若以任意单词被送到哪一个reducer是不影响的，只要所有mapper对于相同的单词能送到相同的reducer即可。

而在排序问题中，各个数值之间有大小关系的制约。

该问题下，最简单的方式就是仅仅使用一个reducer，将所有数据送到这一个节点进行处理。自然，这是一个比较愚蠢的办法。

另外一个思路就是，将reducer编号，我们只要保证第n号reducer中的任意数值都大于等于n-1号中的任意数值（我们可以称其为范围有序），并且各reducer中的数值都有序，最终的排序结果即为将这些数值按升序排序的结果。

所以现在问题变为了	``如何保证reducer中的数据范围有序``。Spark中，使用RangePartitioner来解决这个问题。

## RangePartitioner

顾名思义，该分割器用于将mapper数据分割成多个段，各段之间保证范围有序。保证一个mapper输出结果范围有序是容易的，但是如何保证各个mapper之间的数据分段都范围有序（任意mapper的第n段数据都大于等于任意mapper的n-1段的任意数据）。



