---
layout: post
title: 红黑树(Java)
description: red-black tree:concept and implementation
modified: 2014-02-25
tags: [java,数据结构]
category:  Javadevelopment
imagefeature: cs-2.jpg
comments: true
share: true
---

红黑树的概念以及java的实现

## 红黑树简介
红黑树是二叉搜索树的一个改进版本。在每个节点上加入了一个颜色属性。通过约束每个根节点到叶子节点上的颜色，保证任何一条路径都不会比其他路径的两倍长。从而使得红黑树的高度接近于log(n)（n为节点数量）。

红黑树需要满足下面五个属性：

- 1.每个节点不是黑色就是红色。
- 2.根节点是黑色。
- 3.叶子节点（NIL）是黑色
- 4.红色节点的所有孩子为黑色
- 5.对于所有节点，从该节点到其子孙叶节点的所有简单路径包含相同数量的黑节点。

图1 红黑树结构示例图（截自算法导论）
<img src = "/images/redblack/1.png"/>

如上图所示，所有叶节点用一个特殊的哨兵节点——T.nil代表，根节点的父节点为T.nil。这样做可以节省内容占用，并且对于后续的树操作也便利不少。

- code 1,节点颜色

{% highlight java %}
/**
 * Created by Administrator on 14-2-19.
 * The color of red-black tree node
 */
public enum NodeColor {
    Red,Black;
}
{% endhighlight %}

        
- code 2,树节点

{% highlight java %}
/**
 * Created by Administrator on 14-2-19.
 * Node of red-black tree
 */
class RBTreeNode {

    public RBTreeNode(NodeColor color){
        this.color = color;
    }

    public NodeColor color;
    public RBTreeNode p;         // parent of the node
    public RBTreeNode left;      // left subtree of the node
    public RBTreeNode right;     // right subtree of the node

    public int value;            //value of the node
}
{% endhighlight %}

树节点包含了左右子树域、父节点域、颜色域以及值域。此处值域简单设置为int类型，使用中可以将其更改为Comparable类型以扩大使用范围。

- code 3，树基本结构

树包括一个根节点以及一个静态的NIL哨兵节点。
{% highlight java %}
public class RBTree {
    public static final RBTreeNode NIL = new RBTreeNode(NodeColor.Black);        // sentinel node.

    RBTreeNode root = NIL;                                       // tree root
}
{% endhighlight %}


## 红黑树基本变换

### 1、旋转（rotate）

<img src = "/images/redblack/1.png"/>

旋转的作用在于可以调整左右子树的高度。

- code 4,左旋

{% highlight java %}
 /**
     * if node.right if NIL,this will do nothing.
     *
     * @param node
     */
    private void leftRotate(RBTreeNode node) {
        RBTreeNode r = node.right;
        if (r == NIL) {
            return;
        }

        //node is root
        if (node.p == NIL) {
            root = r;
        } else if (node == node.p.left) {
            node.p.left = r;
        } else {
            node.p.right = r;
        }

        node.right = r.left;
        if (r.left != NIL) {
            r.left.p = node;
        }

        r.left = node;
        r.p = node.p;
        node.p = r;
    }
{% endhighlight %}
    
- code 5,右旋
{% highlight java %}
    private void rightRotate(RBTreeNode node) {
        RBTreeNode l = node.left;
        if (l == NIL) {
            return;
        }

        if (node.p == NIL) {
            root = l;
        } else if (node == node.p.left) {
            node.p.left = l;
        } else {
            node.p.right = l;
        }

        node.left = l.right;
        if (l.right != NIL) {
            l.right.p = node;
        }

        l.right = node;
        l.p = node.p;
        node.p = l;
    }
{% endhighlight %}

### 2、替换（transplant）
替换的作用将一个子树替换为另一个子树，
>注：替换不会替换掉孩子节点。

- code 6,替换
{% highlight java %}
    /**
     * replace node u with v
     *
     * @param u
     * @param v
     */
    private void transplant(RBTreeNode u, RBTreeNode v) {
        if (u.p == NIL) {
            root = v;
        } else if (u == u.p.left) {
            u.p.left = v;
        } else {
            u.p.right = v;
        }
        v.p = u.p;
    }
{% endhighlight %}

### 3、最大值（maxmun）
寻找树中值最大的节点。由于每个节点左子树上所有节点的值小于自己，右子树大于大于自己的值，所以最大值只需一直往右走就行。

- code 7,最大值
>
{% highlight java %}
    /**
     * Get the node in subtree node with max value
     *
     * @param node
     * @return
     */
    private RBTreeNode maxMum(RBTreeNode node) {
        if (node == NIL) {
            return NIL;
        }
        RBTreeNode max = node;
        while (max.right != NIL) {
            max = max.right;
        }
        return max;
    }
{% endhighlight %}

### 4.最小值（minmun）
和最大值相反。
- code 8，最小值：

{% highlight java %}
    private RBTreeNode minMun(RBTreeNode node) {
        if (node == NIL) {
            return NIL;
        }

        RBTreeNode min = node;
        while (min.left != NIL) {
            min = min.left;
        }
        return min;
    }
{% endhighlight %}

### 5.搜索节点（find）
搜索给定值是否存在树中。
- code 9，搜索节点：
>
{% highlight java %}
    private RBTreeNode find(int v) {
        RBTreeNode x = root;
        while (x != NIL) {
            if (x.value == v) {
                break;
            }
            if (x.value > v) {
                x = x.left;
            } else {
                x = x.right;
            }
        }
        return x;
    }
{% endhighlight %}

## 插入操作（Insert）
红黑树的插入和普通二叉搜索树插入有几个区别：1）需要将新节点初始化为红色；2）插入之后可能会破坏树结构，使得无法满足要求的5个属性，故需要对树进行修复。插入操作首先找到应该插入的位置，插入之后调用了insertFixUp对树进行修复。

在进行修复时，在可以直接修复的情况下则进行修复，在无法直接修复的情况下，则是将其转换为可以修复的情况。

根据红黑树的属性，插入一个红色节点之后，唯一可能破坏的就是出现红色节点有了红色的直接后继节点，所以这是修复的起点。

在节点的修复过程中，采用两种方法：

* 1.重新着色，使得满足属性4
* 2.旋转，使得满足属性5

而这两个方法是可能相互抵触的，重新着色可能会导致左右子树黑色节点高度（简单路径上黑色节点的数量）不一致，而旋转又可能导致红色节点存在直接的红色后继节点，如图 3。

<img src = "/images/redblack/3.png"/>

在重新着色时，必须两个子树同时重新着色才可以保证平衡，而在左旋转时，需要保证旋转点和气右子树的左节点不能皆为红色。根据这两点，可以将需要修复的情况分为如下三种情况。
>注：此处仅考虑新插入节点的父节点是在其爷爷节点左边的情况，右边情况与其正好相反。

**1.新插入节点的父节点以及父节点的兄弟节点皆为红色**
可以直接修复。

这种情况可以同时将其重新着色为黑色。这样使得该子树黑节点高度平衡且满足颜色约束。但是这样使得该子树的整体黑色节点高度增加了1，为了保证平衡，所以需要将子树的跟节点重新着色为红色。此时，子树的跟节点的父节点又可能为红色，破坏属性4，所以需要再一次的调整。注：Bh为黑色节点高度，其中叶节点未画出。

<img src = "/images/redblack/4.png"/>

**2.父节点的兄弟节点为黑色，新插入节点是其父节点的左子树**

可以直接修复。

这种情况下，不能通过case1的方法直接同时重新着色解决，而只能通过选择调整左右子树的黑色节点高度。而在这种情况下，其父节点的右子树一定为黑色（新插入之前该子树满足属性4）。此时可以采取将父节点与爷爷节点的颜色交换，并以爷爷节点右旋达到修复。

<img src = "/images/redblack/5.png"/>

此图看起来似乎不平衡，但是x节点的后继节点并为画出，并且α节点可能为叶子节点。在这种情况下下，该子树达到了平衡，并且没有增加黑色节点的数量，子树的根节点仍然为黑色，所以这种调整之后，树不需要再进行调整。

**3.父节点的兄弟节点为黑色，新插入节点是其父节点的右子树**

不可直接修复，将其转换为case2。

此时直接选择会出现图3中出现的问题，违背属性4。此时的处理方式是将其转换为case2，然后进行处理。

首先以z选择，然后调整x，z指向的位置。x始终指向需要修复的起点，所以调整期指向位置是必须的。

<img src = "/images/redblack/6.png"/>

- code 10 ，插入：

{% highlight java %}
public void insert(int v) {
        RBTreeNode newNode = new RBTreeNode(NodeColor.Red);
        newNode.value = v;
        newNode.left = NIL;
        newNode.right = NIL;

        //empty tree
        if (root == NIL) {
            root = newNode;
            newNode.p = NIL;
        } else {
            RBTreeNode y = root;
            RBTreeNode x = y;

            //find the parent node of newNode
            while (x != NIL) {
                y = x;
                if (x.value > newNode.value) {
                    x = x.left;
                } else {
                    x = x.right;
                }
            }

            if (y.value > newNode.value) {
                y.left = newNode;
                newNode.p = y;
            } else {
                y.right = newNode;
                newNode.p = y;
            }

        }
        //fix up the tree ,to keep the properties
        insertFixUp(newNode);
    }
{% endhighlight %}

- code 11，插入修复：

{% highlight java %}
private void insertFixUp(RBTreeNode node) {
        RBTreeNode x = node;
        RBTreeNode y = null;
        while (x.p.color == NodeColor.Red) {
            if (x.p == x.p.p.left) {
                y = x.p.p.right;
                if (y.color == NodeColor.Red) {                       //case 1
                    x.p.color = NodeColor.Black;
                    y.color = NodeColor.Black;
                    x.p.p.color = NodeColor.Red;
                    x = x.p.p;
                    continue;
                }
                if (x == x.p.right) {                                //case 2
                    x = x.p;
                    leftRotate(x);
                }
                x.p.color = NodeColor.Black;                         //case 3
                x.p.p.color = NodeColor.Red;
                rightRotate(x.p.p);
            } else {
                y = x.p.p.left;
                if (y.color == NodeColor.Red) {                       //case 1
                    x.p.color = NodeColor.Black;
                    y.color = NodeColor.Black;
                    x.p.p.color = NodeColor.Red;
                    x = x.p.p;
                    continue;
                }
                if (x == x.p.left) {                                 //case 2
                    x = x.p;
                    rightRotate(x);
                }
                x.p.color = NodeColor.Black;                        //case 3
                x.p.p.color = NodeColor.Red;
                leftRotate(x.p.p);
            }

        }
        root.color = NodeColor.Black;
    }
{% endhighlight %}

>注：修复中的case2和case3与上述的正好相反。

其中，case1之后可能还会是case1，所以需要结束本次循环。而对于case2，其变换结果就是变成case3。

## 4.红黑树删除
 在删除时，首先选择该节点中的一个节点替换该节点，在需要进行修复的时候，需要确定修复的起点。

若待删除的节点颜色为**红色**，有两种情况：1）左右子树皆为NIL；2）左右子树皆不为NIL（因为它不能有红色直接后继节点）。

第一种情况，直接用NIL替换掉该节点即可，不会破坏原有结构，不需要修复。

第二种情况，需要从其右子树中选择最小值节点，将其颜色更改为红色，并替换掉待删除的节点。此种情况下，若最小值节点原来也是红色，那么它的左右子树皆为NIL(因为最小值左子树为NIL，并且它为红色，只能有黑色直接后继，而只有右直接后继会破坏黑色节点高度平衡)，此时红黑树的五个属性都不会被破坏，不需要修复。而如果最小值节点原来为黑色，替换待删除节点之后，黑色节点减少了一个，这将导致黑色节点高度不平衡，就需要进行修复。此时修复起点为最小值节点的右子树（包括NIL）。

若待删除的节点为**黑色**，那么有三种情况：1）左右子树皆为NIL；2）只有一个红色直接后继节点；3）左右子树皆不为NIL。

* 第一种情况，使用NIl将其替换，此时树黑色节点减少了一个，将导致该节点所在子树黑色节点高度与其兄弟的不平衡，需要进行修复。修复起点为待删除节点的右子树（包括NIL）。

* 第二种情况，直接用其后继节点替换即可。同样，黑色节点减少了一个，需要修复。修复起点为其唯一的一个红色后继节点。

* 第三种情况，选择右子树最小值节点，将其颜色更改为黑色，然后替换该节点，这样能保证不会违背属性4。此时最小值节点的情况就和待删除节点为红色时，对最小值节点处理的方法一样。此时修复起点为最小值节点的右子树（包括NIL）。

所以可以看到，修复节点所在的子树黑色节点高度比起兄弟小1，当修复起点为红色时，只需要将其更改为黑色，即可进行修复。但是当修复起点为黑色时，就会有以下四种情况（仅包括修复起点在其父节点左端的情况，右端情况恰好相反）：

**case 1 修复起点的兄弟为黑色，并且其兄弟直接后继皆为黑色：**

可以直接修复。

这种情况下，直接将其兄弟重新着色为红色即可使得左右子树平衡。但是该子树整体的黑色节点高度降低了1，修复没有完全完成，需要将修复起点设置为其父节点，再一次修复。注意其中修复起点x的位置变化。
>注：蓝色为任何颜色。

<img src = "/images/redblack/7.png"/>

**case 2 修复起点的兄弟为黑色，并且兄弟的直接右后继为红色**

可以直接修复.

这种情况下，如图8，将y与z颜色交换，并将y的右子树β着色为黑色，然后将z左旋。变换后，子树左右达到平衡，并且子树的根节点为发生变化，子树的黑色节点高度也恢复到以前的高度。此种修复完成后，就不需要再进行修复了。
>注：x节点的后继没有画出，根据修复节点的性质，x所在的子树比y所在的子树黑色节点高度少1。

<img src = "/images/redblack/8.png"/>

**case 3 修复起点的兄弟为黑色，并且其兄弟的左后继为黑色，右后继为红色**

不能直接修复，将其转换为case2。

将y颜色与y的做后继α交换，然后以y右旋转，即可将该种情况转换为case2。

<img src = "/images/redblack/9.png"/>

**case 4 修复起点的兄弟为红色**

不能直接修复，变换知道变为case1~3。

将z与y交换颜色，将z左旋。

这种变换就得看α的后继节点情况为确定转为为1~3的哪一种情况。由于α是黑色，所以转换后不会是case4，也就是这种变换肯定能得到一种可以直接修复的情况。

<img src = "/images/redblack/10.png"/>

- code 12 删除节点：

{% highlight java %}
 public boolean delete(int v) {
        boolean result = false;

        RBTreeNode x = find(v);
        //v exists in the tree
        if (x != NIL) {

            NodeColor originalColor = x.color;
            RBTreeNode y = null;
            RBTreeNode z = null;
            if (x.left == NIL) {
                z = x.right;
                transplant(x, x.right);
            } else if (x.right == NIL) {
                z = x.left;
                transplant(x, x.left);
            } else {
                y = minMun(x.right);
                z = y.right;
                
                originalColor = y.color;
                if (y.p == x) {
                    z.p = y;
                } else {
                    transplant(y, y.right);
                    y.right = x.right;
                    y.right.p = y;
                }
                transplant(x, y);
                y.left = x.left;
                y.left.p = y;
                y.color = x.color;
            }
            if (originalColor == NodeColor.Black) {
                deleteFixUp(z);
            }
            result = true;
        }
        return result;
    }

{% endhighlight %}
    
- code 13 删除修复：

>注：其中的case1~case4与上述情况没有一一对应。
{% highlight java %}
    private void deleteFixUp(RBTreeNode node) {
        RBTreeNode x = node;
        while (x != root && x.color == NodeColor.Black) {
            RBTreeNode y = null;
            if (x == x.p.left) {
                y = x.p.right;
                if (y.color == NodeColor.Red) {                     //case 1
                    y.color = NodeColor.Black;
                    y.p.color = NodeColor.Red;
                    leftRotate(y.p);
                    y = x.p.right;
                }
                if (y.left.color == NodeColor.Black
                        && y.right.color == NodeColor.Black) {     //case 2
                    y.color = NodeColor.Red;
                    x = x.p;
                    continue;
                }
                if (y.right.color == NodeColor.Black) {            //case 3
                    y.left.color = NodeColor.Black;
                    y.color = NodeColor.Red;
                    rightRotate(y);
                    y = x.p.right;
                }
                //case 4
                y.color = y.p.color;                           //change y and y.p color;
                y.p.color = NodeColor.Black;                   //original color of y is black
                y.right.color = NodeColor.Black;
                leftRotate(y.p);
                x = root;
            } else {
                y = x.p.left;
                if (y.color == NodeColor.Red) {                     //case 1
                    y.color = NodeColor.Black;
                    y.p.color = NodeColor.Red;
                    rightRotate(y.p);
                    y = x.p.left;
                }
                if (y.left.color == NodeColor.Black
                        && y.right.color == NodeColor.Black) {     //case 2
                    y.color = NodeColor.Red;
                    x = x.p;
                    continue;
                }
                if (y.left.color == NodeColor.Black) {            //case 3
                    y.right.color = NodeColor.Black;
                    y.color = NodeColor.Red;
                    leftRotate(y);
                    y = x.p.left;
                }
                //case 4
                y.color = y.p.color;                           //change y and y.p color;
                y.p.color = NodeColor.Black;                   //original color of y is black
                y.left.color = NodeColor.Black;
                rightRotate(y.p);
                x = root;
            }
        }
        x.color = NodeColor.Black;
    }
{% endhighlight %}

## 5.测试
下面附上测试代码：

- code 14，测试代码

{% highlight java %}
import org.junit.Test;

import java.util.*;

import static org.junit.Assert.fail;

/**
 * Created by kali on 14-2-24.
 */
public class RBTreeTest {
    /**
     * check color of tree
     *
     * @param tree
     * @return false if exists a red tree node has red child.
     */
    private boolean checkColor(RBTree tree) {

        if (tree.root == RBTree.NIL) {
            return true;
        }
        Queue<RBTreeNode> nodes = new LinkedList<RBTreeNode>();
        nodes.offer(tree.root);
        while (!nodes.isEmpty()) {
            RBTreeNode node = nodes.poll();

            if (node.left != RBTree.NIL) {
                nodes.offer(node.left);
            }
            if (node.right != RBTree.NIL) {
                nodes.offer(node.right);
            }
            if (node.color == NodeColor.Red) {
                if (node.left.color == NodeColor.Red
                        || node.right.color == NodeColor.Red) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * check black height of tree
     *
     * @param tree
     * @return false if exists subtree whose black height of left subtree doesn't equal to right's
     */
    private boolean checkBheight(RBTree tree) {
        int height = bheight(tree.root);
        if (height > 0) {
            return true;
        }
        return false;
    }

    /**
     * get black of tree
     *
     * @param subTree
     * @return positive number if black height of left subtree equals to right's or -1.
     */
    private int bheight(RBTreeNode subTree) {
        if (subTree == RBTree.NIL) {
            return 1;
        }

        int leftBheight = bheight(subTree.left);
        int rightBheight = bheight(subTree.right);
        if (leftBheight == rightBheight && leftBheight != -1) {
            return (subTree.color==NodeColor.Black)
                    ?(leftBheight+1)
                    :leftBheight;
        }
        return -1;
    }

    @Test
    public void testInsert() throws Exception {
        int testTimes = 1000;
        int num = 20000;
        Random random = new Random();
        for (int i = 0; i < testTimes; i++) {
            RBTree tree = new RBTree();
            for (int j = 0; j < num; j++) {
                int n = random.nextInt(num);
                tree.insert(n);
            }
            if (!checkColor(tree) || !checkBheight(tree)) {
                fail();
            }
        }
    }

    @Test
    public void testDelete() throws Exception {
        int testTimes = 1000;
        int num = 2000;
        Random random = new Random();

        for (int i = 0; i < testTimes; i++) {
            RBTree tree = new RBTree();
            List<Integer> numbers = new ArrayList<Integer>();

            for (int j = 0; j < num; j++) {
                int n = random.nextInt(num);
                numbers.add(n);                      // generate test numbers
                tree.insert(n);
            }
            for (int n : numbers) {
                tree.delete(n);
                if (!checkColor(tree) ) {
                    fail("color not match");
                }
                if( !checkBheight(tree) ){
                    fail(" height not match");
                }
            }
        }
    }
}

{% endhighlight %}