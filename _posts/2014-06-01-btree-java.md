---
layout: post
title: B树(Java)实现
description: implementation of b-tree in java
modified: 2014-06-01
tags: [java,数据结构]
imagefeature: cs-1.jpg
category: Javadevelopment
comments: true
share: true
---
B树(Java)实现

## B树基本概念

### 1.1 B树背景

B树是用于在外存工作的平衡搜索树。

当数据比较大，无法全部存入内存时，需要将部分数据存在外存中，在需要的时候读入内存，修改之后又写回外存。由于外存的速度与内存有几个数量级的差别，所以节省在外存上花的时间，对搜索树的性能提高时最有效的。

最常见的外存就是磁盘。磁盘是快设备，也就是说磁盘的读写单位是以块为单位，一般地块大小从0.5k到4k。即使你只读取一个字节，磁盘也是将包含该字节的所有数据读取到硬盘中。而在磁盘读取过程中，最占用时间的是磁盘的寻道，也就是磁头在盘片上找到需要读取的块所在位置的时间，而在盘片上顺序读取数据的所花的时间是占比比较小的。

要减少外存上花的时间，就可以从减少读盘次数以及减少寻道时间着手。

B树采取的方法就是，就充分的利用盘块的空间，在一个盘块中尽可能多的存储信息，或者在连续的盘块地址上存储尽可能多的信息。在数据结构上的变化就是每个节点存储多个key信息以及包含多个子节点。增加节点的分支树，就可以使得这棵树的高度降低，比如高度为2（roo高度为0）分支1000的数，就以存储1000\*1000个关键字信息，而二叉树j的高度就至少需要6\*ln10。

如下图，M，D，J等称为key，也就是存入B树种的数据项。


图1 -B树示例（来自《算法导论》）
<img src = "/images/btree/1.png"/>

### 1.2 B树定义
（来自《算法导论》第三版）
B树T有如下性质：

- 1. 每个节点x有如下属性：
x.n表示节点当前key的个数。
x中key满足：x.key1 <= x.key2<= x.key3 <= ....    <= x.keyx,n。也就是x中的key以非降序顺序排列。
x要么是叶子节点，要么是内部节点。
- 2. 每个内部节点包含x.n + 1 个引用，指向x.n + 1个孩子节点。叶子节点没有孩子节点。
- 3. x的key将孩子节点区分开，也就是满足：设ki 为 子树i中的任意key值，k1 <= x.k1 <= k2 <= x.k2 ....<= x.kx.n <= kx.n+1.
- 4. 所有的叶子节点在同一层
- 5. 每个节点拥有的key以及孩子的数量有约束，设整数 t>=2 为最小度：
 
除根节点外，每个节点必须有至少t-1个key，t个孩子。树不为空时，根节点至少有一个key。
每个节点至多有2\*t-1个key，每个内部节点至多有2\*t个孩子。当一个节点有2\*t-1个key时，称其为满节点。

`t=2的B树称为2-3-4树`，因为可以由2-3-4个孩子。

## B树基本操作

### 2.1 查找
B树的查找和二叉树查找类似，首先在当前节点中查找，如果没有并且存在孩子节点，就递归的到可能存在该key的孩子节点中查找。
不同的是，B树节点有多个key，需要每个都比较，为了提高性能，可以使用二分法加速节点中的查找。

图2 -B树查找伪码（来自《算法导论》）
<img src = "/images/btree/2.png"/>

### 2.2 树的创建
B树创建很简单，将B树节点分配为一个空的叶子节点即可。

###2.3 插入key

B树的插入只会在叶子节点中插入key，内部节点之后将插入操作传递到适当的子树中去，知道叶子节点中。

B树的插入需要考虑的一个问题就是当节点以满时，需要将该节点分裂成两个节点。
一个满的节点有2*t-1个key，内部节点有2*t 个孩子，分裂将其分成两个各有t-1个key，内部节点各t个孩子，多余的一个节点插入到父节点中，作为分裂之后两个节点的分割key。
如图，一个最小度为3的满节点，分裂之后，key C上移到父节点，成为分裂之后两个节点的分割key。分裂之后，父节点多了一个key和一个孩子。

图3 -B树分裂示例
<img src = "/images/btree/3.png"/>

为了是插入操作可以顺树根到叶子节点一遍完成，而不需要回溯到父节点中，需要做如下操作：
若是根节点，则生成一个新的根节点，原根节点作为新根节点的第一个孩子，并对该孩子进行分裂操作。

若是内部节点，每次向适当孩子传递操作时，都需要检查该子树是否已满，若满则进行该子树，再将插入操作传递到适当的子树中。

若是叶子节点，则在适当的位置插入需要插入的key

如此，则传递到需要操作的叶子节点都是不满的，都可以直接进行插入操作。并且可以看到，B树的高度增加只有在根节点已满时，分裂根节点增加高度，所以使得所有叶子节点的高度一样。

插入示例：

图4 -B树插入示例（来自《算法导论》）
<img src = "/images/btree/4.png"/>

该B树最下度为3，所以节点最多有5个key，最少有2个key。

* b) 插入B：孩子未满，直接插入
* c) 插入Q：孩子已满，分裂子树，key T上移到父节点中，然后在将Q插入到适当的孩子中
* d) 插入L：root已满，生成新root节点，分裂老root节点，在适当子树中插入适当孩子中
* e) 插入F：孩子已满，分裂子树，key C上移到父节点，在适当节点中插入Q

###2.4 删除key
删除的时候，当key存在的节点的key数量等于t-1时，再删除就会破坏B树属性，所以为了不回溯，在删除操作传递到子树中之前，需要检查子树key的数量。

删除操作步骤如下:

- 1.待删除key如果在当前节点中，转2，否则转8
- 2．当前节点是叶子，直接删除，完成删除操作。否则转3
- 3．待删除key分割的子树中，前一棵子树key的数量大于t-1，转4，否则转5.
- 4．从前一颗子树中删除该子树根节点中最大的key，将该key替换当前节点中待删除key，完成删除操作。
- 5.待删除key分割的子树中，后一棵子树的key数量打于t-1，转6，否则转7.
- 6.从后一颗子树中的根结点中删除该节点最小的key，用该key替换待删除key，完成删除。
- 7.合并该节点分割的两个子树，并从合并之后的子树中删除待删除key。
- 8.找到key可能存在的子树Tn，转9
- 9.该子树前一颗子树Tn-1的根节点key数量大于t-1，转10，否则转12
- 10.将Tn-1中最大的key替换当前节点中适当的key，并将被替换的key插入到Tn中，转11
- 11.将Tn-1中最后一个孩子，移动到Tn中适当的位置，将删除操作传递到Tn中。
- 12.Tn的后一颗子树Tn+1的根节点key数量大于t-1,转13，否则转？
- 13.将Tn+1中最小的key替换当前节点，并将被替换的key插入到Tn+1中，转14
- 14.将Tn+1中最小的子树移动到Tn中，将删除操作传递Tn中。
- 15.删除中，可能会出现根节点没有key的情况，所以删除结束之后需要检查根节点，若发生这种情况，需要将根节点更新为原根节点的唯一的一颗子树。

示例:


图5 -删除操作示例(来自《算法导论》）
<img src = "/images/btree/5.png"/>
<img src = "/images/btree/6.png"/>

## 代码实现

### 3.1 AbstractBTreeNode
{% highlight java %}
import java.util.LinkedList;
import java.util.Queue;

/**
 * Created by Kali on 14-5-26.\
 * Abstract node.
 */
public abstract class AbstractBTreeNode<K extends Comparable<K>> {

    protected final int degree;

    AbstractBTreeNode(int degree) {
        if (degree < 2) {
            throw new IllegalArgumentException("degree must >= 2");
        }
        this.degree = degree;
    }

    /**
     * If the node is leaf.
     *
     * @return true if is leaf,false if not.
     */
     abstract boolean isLeaf();

    /**
     * Search key in the B-Tree.
     *
     * @param key the key to search
     * @return key in the B-tree or null if key does not exist in the tree.
     */
    abstract K search(K key);

    /**
     * Insert a key in to a node when the node is not full.
     *
     * @param key the key to insert
     * @throws java.lang.RuntimeException if node is full
     */
    abstract void insertNotFull(K key);

    /**
     * <p>Delete a key when the {@code keys >= degree}.</p>
     * <p>If key to delete does not exist in current node,internal node will find a subtree tree the key
     * may exist in,find the key in subtree and delete;the leaf will do nothing if the key to delete
     * does not exist.</p>
     *
     * @param key the key to delete.
     */
    abstract void deleteNotEmpty(K key);

    /**
     * <p>Insert a key in to B-Tree.</p>
     * <p>Insert a key into current node.</p>
     *
     * @param key the key to insert
     * @throws java.lang.RuntimeException if current is full.
     */
    void insertKey(K key) {
        checkNotFull();
        int i = this.nkey();
        //move keys
        while (i > 0 && key.compareTo(this.getKey(i - 1)) < 0) {
            this.setKey(this.getKey(i - 1), i);
            i--;
        }
        this.setKey(key, i);
        this.setNKey(this.nkey() + 1);
    }

    /**
     * <p>Get a key with index of {@code idx} in current node</p>
     *
     * @param idx idx of key to get.
     * @return key of given index
     * @throws java.lang.RuntimeException if {@code idx < 0 } or {@code idx >= degree *2 -1}
     */
     abstract K getKey(int idx);

    /**
     * <p>Delete given key in current node.</p>
     *
     * @param key the key to delete.
     * @return the key deleted or null if key does not exist.
     */
    protected K deleteKey(K key) {
        int index = indexOfKey(key);
        if (index >= 0) {
            return this.deleteKey(index);
        }
        return null;
    }

    /**
     * <p>Delete a key with given index.</p>
     *
     * @param index index of key to delete
     * @return key deleted or null if index is invalid.
     * @throws java.lang.RuntimeException if index is invalid
     */
    protected K deleteKey(int index) {
        if (index < 0 || index >= this.nkey()) {
            throw new RuntimeException("Index is invalid.");
        }
        K result = this.getKey(index);
        while (index < this.nkey() - 1) {
            this.setKey(this.getKey(index + 1), index);
            index++;
        }
        this.setKey(null, this.nkey() - 1);
        this.setNKey(this.nkey() - 1);
        return result;

    }

    /**
     * <p>Check if current exists given key</p>
     *
     * @param key key to check
     * @return true is given key exists in current node.
     */
     boolean existsKey(K key) {
        return indexOfKey(key) >= 0;
    }

    /**
     * Replace one key with newKey
     *
     * @param oldKey the key to replace
     * @param newKey the new key to insert in
     */
    protected void replaceKey(K oldKey, K newKey) {
        int index = indexOfKey(oldKey);
        if (index >= 0) {
            setKey(newKey, index);
        }
    }

    /**
     * Replace given index key with a new key
     *
     * @param newKey      the new key to insert in
     * @param oldKeyIndex old key index
     * @return the key be replaced or null if index is invalid
     */
    protected abstract K setKey(K newKey, int oldKeyIndex);

    /**
     * Set one of current child with given index.
     *
     * @param sub   child subtree
     * @param index index of child to set
     */
    protected abstract void setChild(AbstractBTreeNode<K> sub, int index);

    /**
     * Insert a child at given index.
     *
     * @param sub   child subtree to insert
     * @param index index of child to insert
     */
    protected void insertChild(AbstractBTreeNode<K> sub, int index) {
        int i = this.nchild();
        while (i > index) {
            this.setChild(this.getChild(i - 1), i);
            i--;
        }
        this.setChild(sub, index);
        this.setNChild(this.nchild() + 1);
    }

    /**
     * Get child with given index.
     *
     * @param index index of child to get
     * @return child subtree of null if index is invalid
     */
     abstract AbstractBTreeNode<K> getChild(int index);

    /**
     * Delete given child in current node.
     *
     * @param child child subtree to delete.
     */
    protected void deleteChild(AbstractBTreeNode<K> child) {
        int index = -1;
        for (int i = 0; i < nchild(); i++) {
            if (this.getChild(i) == child) {
                index = i;
                break;
            }
        }
        if (index >= 0) {
            deleteChild(index);
        }
    }

    /**
     * Delete child with given index
     *
     * @param index index of child to delete
     * @return child subtree or null if index is invalid
     */
    protected AbstractBTreeNode<K> deleteChild(int index) {
        AbstractBTreeNode<K> result = null;
        if (index >= 0 && index < this.nchild()) {
            result = this.getChild(index);
            while (index < this.nchild() - 1) {
                this.setChild(this.getChild(index + 1), index);
                index++;
            }
            this.setChild(null, index);
            this.setNChild(this.nchild() - 1);
        }
        return result;
    }

    /**
     * Split a full child to two child node.
     *
     * @param child child index to split
     * @throws java.lang.RuntimeException is child to spilt is not full
     */
    protected abstract void splitChild(int child);

    /**
     * Split current node to two node.
     *
     * @param newNode new node
     * @return middle of current node before split
     * @throws java.lang.RuntimeException if current node is not full.
     */
    protected abstract K splitSelf(AbstractBTreeNode<K> newNode);

    /**
     * Merge current node with another .
     *
     * @param middle  middle key of the two node
     * @param sibling sibling node to merge
     * @throws java.lang.RuntimeException if keys of either node exceed degree-1.
     */
    protected abstract void merge(K middle, AbstractBTreeNode<K> sibling);

    /**
     * Set key amount of current node.
     *
     * @param nkey key amount to set
     * @return old key amount
     */
    protected abstract int setNKey(int nkey);

    /**
     * Key amount of current node.
     *
     * @return key amount of current node.
     */
     abstract int nkey();

    /**
     * Child amount of current node.
     *
     * @return child amount.
     */
     abstract int nchild();

    /**
     * Set child amount of current node.
     *
     * @param nchild child amount.
     * @return old child amount.
     */
    protected abstract int setNChild(int nchild);

    /**
     * Get index of given key.
     *
     * @param key the key to get.
     * @return index of key or -1 if key does not exist in current node.
     */
    protected int indexOfKey(K key) {
        for (int i = 0; i < this.nkey(); i++) {
            if (key.equals(this.getKey(i))) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Check whether current node is full.
     *
     * @return true if current node is full,else false.
     */
    protected boolean isFull() {
        return nkey() == degree * 2 - 1;
    }

    /**
     * Check current node is not full.
     *
     * @throws java.lang.RuntimeException if current is full.
     */
    protected final void checkNotFull() {
        if (isFull()) {
            throw new RuntimeException(this.toString() + " is full.");
        }
    }

    /**
     * Recursively traverse the B-Tree,constitute a string.
     *
     * @param root root of B-Tree.
     * @param <K> Type of key of B-Tree
     * @return String of B-Tree.
     */
    static <K extends Comparable<K>> String BTreeToString(AbstractBTreeNode<K> root){
        StringBuffer sb = new StringBuffer();
        AbstractBTreeNode node;
        Queue<AbstractBTreeNode> queue = new LinkedList<>();
        queue.add(root);
        String newLine = System.getProperty("line.separator");
        while (!queue.isEmpty()){
            node = queue.poll();
            sb.append(node).append(newLine);
            int i = 0;
            while (node.getChild(i) != null){
                queue.offer(node.getChild(i));
                i++;
            }
        }
        return sb.toString();
    }
}

{% endhighlight %}

### 3.2 BTreeInternalNode
{% highlight java %}
/**
 * Created by Kali on 14-5-26.
 */
class BTreeInternalNode<K extends Comparable<K>> extends AbstractBTreeNode<K> {

    private final Object[] keys;
    private final AbstractBTreeNode<K>[] children;
    private int nkey = 0;
    private int nchild = 0;

    BTreeInternalNode(int degree) {
        super(degree);
        keys = new Object[2 * degree - 1];
        children = new AbstractBTreeNode[2 * degree];
    }

    @Override
    protected boolean isLeaf() {
        return false;
    }


    @Override
    K getKey(int idx) {
        return (K) keys[idx];
    }

    @Override
    protected K setKey(K newKey, int oldKeyIndex) {
        K old = (K) keys[oldKeyIndex];
        keys[oldKeyIndex] = newKey;
        return old;
    }

    @Override
    protected void setChild(AbstractBTreeNode<K> sub, int index) {
        children[index] = sub;
    }

    @Override
    AbstractBTreeNode<K> getChild(int index) {
        if (index >= 0 && index < children.length) {
            return children[index];
        }
        return null;
    }

    @Override
    protected int setNKey(int nkey) {
        int old = this.nkey;
        this.nkey = nkey;
        return old;
    }

    @Override
    int nkey() {
        return nkey;
    }

    @Override
    int nchild() {
        return nchild;
    }

    @Override
    protected int setNChild(int nchild) {
        int old = this.nchild;
        this.nchild = nchild;
        return old;
    }


    @Override
    K search(K key) {
        int index = indexOfKey(key);
        if (index >= 0) {
            return (K) keys[index];
        }
        index = 0;
        while (key.compareTo((K) keys[index++]) > 0) ;
        return children[index].search(key);
    }

    @Override
    void insertNotFull(K key) {
        checkNotFull();
        int i = 0;
        while (i < nkey && key.compareTo((K) keys[i]) >= 0) {
            i++;
        }
        if (this.children[i].isFull()) {
            this.splitChild(i);
            if (key.compareTo((K) this.keys[i]) > 0) {
                i++;
            }
        }

        this.children[i].insertNotFull(key);
    }

    @Override
    void deleteNotEmpty(K key) {
        //key in this node
        if (this.existsKey(key)) {
            int index = indexOfKey(key);
            AbstractBTreeNode<K> node;
            //predecessor child could delete
            if ((node = children[index]).nkey() >= degree) {
                K repKey = node.getKey(node.nkey() - 1);                  //maximum key in predecessor
                node.deleteNotEmpty(repKey);
                setKey(repKey, index);
            }
            //follow child could delete a key
            else if ((node = children[index + 1]).nkey() >= degree) {
                K repKey = node.getKey(0);                              //minimum key in follow
                node.deleteNotEmpty(repKey);
                setKey(repKey, index);
            }

            //merge predecessor with follow
            else {
                node = children[index];
                node.merge(key, children[index + 1]);
                this.deleteKey(index);
                this.deleteChild(index + 1);
                node.deleteNotEmpty(key);
            }
    }

    //key may exist in child
    else{
        int i = 0;
        //find proper child the key may exists in
        while (i < nkey) {
            if (key.compareTo((K) keys[i]) < 0)
                break;
            i++;
        }
        AbstractBTreeNode<K> target = children[i];
        //child has enough key
        if (target.nkey() >= degree) {
            target.deleteNotEmpty(key);
        } else {
            AbstractBTreeNode<K> sibling;
            //try to find replacement from predecessor
            if (i > 0 && (sibling = children[i - 1]).nkey() >= degree) {
                if (!target.isLeaf()) {
                    AbstractBTreeNode<K> sub = sibling.deleteChild(nchild); //last child
                    target.insertChild(sub, 0);
                }
                K repKey = sibling.deleteKey(sibling.nkey() - 1);    //maximum key
                repKey = setKey(repKey, i - 1);
                target.insertKey(repKey);
                target.deleteNotEmpty(key);
            }
            //try to find replacement from follower
            else if (i < nkey && (sibling = children[i + 1]).nkey() >= degree) {
                if (!target.isLeaf()) {
                    AbstractBTreeNode<K> sub = sibling.deleteChild(0);  //first child
                    target.insertChild(sub, target.nchild());
                }
                K repKey = sibling.deleteKey(0);                    //minimum key
                repKey = setKey(repKey, i);
                target.insertKey(repKey);
                target.deleteNotEmpty(key);
            }
            //merge child with one of it's sibling
            else {
                //merge with predecessor sibling
                if (i > 0) {
                    K repKey = this.deleteKey(i - 1);
                    sibling = children[i - 1];
                    sibling.merge(repKey, target);
                    this.deleteChild(target);
                    sibling.deleteNotEmpty(key);
                } else {
                    K repKey = this.deleteKey(i);
                    sibling = children[i + 1];
                    target.merge(repKey, sibling);
                    deleteChild(i + 1);
                    target.deleteNotEmpty(key);
                }
            }
        }
    }

}

    @Override
    protected void splitChild(int child) {
        AbstractBTreeNode<K> old = children[child];
        AbstractBTreeNode<K> neo = old.isLeaf()
                ? new BTreeLeaf<>(degree)
                : new BTreeInternalNode<>(degree);
        K middle = old.splitSelf(neo);
        this.insertKey(middle);
        this.insertChild(neo, child + 1);
    }

    @Override
    protected K splitSelf(AbstractBTreeNode<K> newNode) {
        if (!(newNode instanceof BTreeInternalNode)) {
            throw new RuntimeException("Instance not match.");
        }
        if (!isFull()) {
            throw new RuntimeException("Node is not full");
        }

        K middle = (K) keys[degree - 1];
        BTreeInternalNode<K> node = (BTreeInternalNode) newNode;
        int i = 0;
        while (i < degree - 1) {
            node.keys[i] = this.keys[i + degree];
            this.keys[i + degree] = null;
            i++;
        }
        this.keys[degree - 1] = null;

        i = 0;
        while (i < degree) {
            node.children[i] = this.children[i + degree];
            this.children[i + degree] = null;
            i++;
        }

        this.nkey = degree - 1;
        node.nkey = degree - 1;
        this.nchild = degree;
        node.nchild = degree;
        return middle;
    }

    @Override
    protected void merge(K middle, AbstractBTreeNode<K> sibling) {
        if (!(sibling instanceof BTreeInternalNode)) {
            throw new RuntimeException("Sibling is not leaf node");
        }
        BTreeInternalNode node = (BTreeInternalNode) sibling;
        this.insertKey(middle);
        for (int i = 0; i < node.nkey(); i++) {
            this.insertKey((K) node.keys[i]);
        }
        for (int i = 0; i < node.nchild(); i++) {
            insertChild(node.children[i], i + degree);
        }
    }


    @Override
    public String toString() {
        StringBuffer sb = new StringBuffer();
        sb.append(" internal node ---- ").append("size: ").append(nkey).append(" keys:").append("[");
        for (int i = 0; i < nkey; i++) {
            sb.append(keys[i]).append(",");
        }
        sb.append("]");
        return sb.toString();
    }
}

{% endhighlight %}

### 3.3 BTreeLeaf

{% highlight java %}
/**
 * Created by Kali on 14-5-26.
 */
public class BTreeLeaf<K extends Comparable<K>> extends AbstractBTreeNode<K> {

    private final Object[] keys;
    private int nkey;

    BTreeLeaf(int degree){
        super(degree);
        keys = new Object[2*degree - 1];
    }


    @Override
    protected boolean isLeaf() {
        return true;
    }

    @Override
    K search(K key) {
        int index = indexOfKey(key);
        if (index >=0)
            return (K) keys[index];
        return null;
    }

    @Override
    K getKey(int idx) {
        return (K) keys[idx];
    }

    @Override
    protected K setKey(K newKey, int oldKeyIndex) {
        K old = (K) keys[oldKeyIndex];
        keys[oldKeyIndex] = newKey;
        return old;
    }

    @Override
    protected void setChild(AbstractBTreeNode<K> sub, int index) {
        throw new RuntimeException("Could not set child of leaf node.");
    }

    @Override
    AbstractBTreeNode<K> getChild(int index) {
        return null;
    }

    @Override
    protected void splitChild(int child) {
        throw new  RuntimeException("Could not split child of leaf node.");
    }

    @Override
    protected int setNKey(int nkey) {
        int old = this.nkey;
        this.nkey = nkey;
        return old;
    }

    @Override
    int nkey() {
        return nkey;
    }

    @Override
    int nchild() {
        return 0;
    }

    @Override
    protected int setNChild(int nchild) {
        throw new RuntimeException("Could set NChild of leaf node.");
    }

    @Override
    void insertNotFull(K key) {
        checkNotFull();
        this.insertKey(key);
    }

    @Override
    void deleteNotEmpty(K key) {
        this.deleteKey(key);
    }

    @Override
    protected K splitSelf(AbstractBTreeNode<K> newNode) {
        if (! (newNode instanceof BTreeLeaf)){
            throw new RuntimeException("Instance not match.");
        }
        if (!isFull()){
            throw new RuntimeException("Node is not full");
        }

        K middle = (K)keys[degree -1];
        BTreeLeaf<K> node = (BTreeLeaf)newNode;
        int i = 0;
        while (i < degree-1){
            node.keys[i] = this.keys[i + degree];
            this.keys[i + degree] = null;
            i++;
        }
        this.keys[degree -1] = null;
        this.nkey = degree -1;
        node.nkey = degree -1;
        return middle;
    }

    @Override
    protected void merge(K middle, AbstractBTreeNode<K> sibling) {
        if ( !(sibling instanceof BTreeLeaf)){
            throw new RuntimeException("Sibling is not leaf node");
        }
        BTreeLeaf node = (BTreeLeaf)sibling;
        this.insertKey(middle);
        for (int i = 0; i < node.nkey(); i++){
            this.insertKey((K)node.keys[i]);
        }
    }

    @Override
    public String toString() {
        StringBuffer sb = new StringBuffer();
        sb.append("leaf----").append("size: ").append(nkey).append(" keys:").append("[");
        for(int i = 0; i < nkey; i++){
            sb.append(keys[i]).append(",");
        }
        sb.append("]");
        return sb.toString();
    }

}

{% endhighlight %}

### 3.4 BTree


{% highlight java %}

/**
 * Created by Kali on 14-5-26.
 */
public class BTree<K extends Comparable<K>> {

private final int degree;
private AbstractBTreeNode<K> root;

public BTree(int degree){
  if (degree < 2){
throw new IllegalArgumentException("degree mustn't < 2");
}
        this.degree = degree;
        root = new BTreeLeaf<>(degree);
    }

    public AbstractBTreeNode<K> getRoot(){
        return root;
    }
    /**
     * Insert a key into B-Tree.
     *
     * @param key key to insert.
     */
    public void insert(K key){
        AbstractBTreeNode<K> n = root;
        if (root.isFull()){
            AbstractBTreeNode<K> newRoot = new BTreeInternalNode<>(degree);
            newRoot.insertChild(n,0);
            newRoot.splitChild(0);
            n = newRoot;
            root = newRoot;
        }
        n.insertNotFull(key);
    }

    /**
     * Delete a key from B-Tree,if key doesn't exist in current tree,will effect nothing.
     *
     * @param key key to delete.
     */
    public void delete(K key){
        AbstractBTreeNode<K> node = root;
        node.deleteNotEmpty(key);
        if (node.nkey() == 0){
            //shrink
            root = node.getChild(0);
            if (root == null){
                root = new BTreeLeaf<>(degree);
            }
        }
    }

    @Override
    public String toString() {
       return AbstractBTreeNode.BTreeToString(this.root);
    }
}
{% endhighlight %}


### 3.5 测试

<pre><code>

package test.yuanye.datastructure.btree;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import yuanye.datastructure.btree.AbstractBTreeNode;
import yuanye.datastructure.btree.BTree;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.*;

import static org.junit.Assert.assertTrue;

/**
 * BTree Tester.
 *
 * @author <Authors name>
 * @version 1.0
 * @since 六月 1, 2014
 */
public class BTreeTest {

    private final List<Integer> keys = new ArrayList<>(12);
    private final List<List<Integer[]>> insertResults = new ArrayList<>(12);
    private final List<List<Integer[]>> deleteResults = new ArrayList<>(12);

    @Before
    public void before() throws Exception {
        int[] ks = new int[]{6, 18, 16, 22, 3, 12, 8, 10, 20, 21, 13, 17};
        for (int i = 0; i < ks.length; i++) {
            keys.add(i, ks[i]);
        }
    }

    @After
    public void after() throws Exception {
        keys.clear();
        insertResults.clear();
    }


    /**
     * Method: insert(K key)
     */
    @Test
    public void testInsert() throws Exception {
        BTree<Integer> tree = new BTree<>(2);
        fillInsertResult();
        for (int i = 0; i < keys.size(); i++) {
            tree.insert(keys.get(i));
            assertTrue(checkBTree(tree, insertResults.get(i)));
        }
    }

    private <K extends Comparable<K>> boolean checkBTree(BTree<K> tree, List<K[]> result)
            throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {

        AbstractBTreeNode<K> node = tree.getRoot();
        Queue<AbstractBTreeNode<K>> nodes = new LinkedList<>();

        Class<?> clazz = node.getClass();
        Method nChild = clazz.getDeclaredMethod("nchild", null);
        Method getChild = clazz.getDeclaredMethod("getChild", int.class);
        Method nKey = clazz.getDeclaredMethod("nkey", null);
        Method getKey = clazz.getDeclaredMethod("getKey", int.class);
        nChild.setAccessible(true);
        getChild.setAccessible(true);
        nKey.setAccessible(true);
        getKey.setAccessible(true);

        int nodeIndex = 0;
        while (node != null) {
            //add children
            int nchild = (Integer) nChild.invoke(node, null);
            for (int i = 0; i < nchild; i++) {
                Object n = (AbstractBTreeNode<K>) getChild.invoke(node, nchild);
                if (n != null) {
                    nodes.offer((AbstractBTreeNode<K>) n);
                }
            }
            K[] nodeKeys = result.get(nodeIndex++);
            //compare keys
            for (int i = 0; i < nodeKeys.length; i++) {
                if (!getKey.invoke(node, i).equals(nodeKeys[i])) {
                    return false;
                }
            }
            node = nodes.poll();
        }
        return true;
    }

    private void fillInsertResult() {

        //tree values after insert keys
        Integer[][][] res = {
                { {6} },                                                            // 6
                { {6, 18} },                                                        // 18
                { {6, 16, 18} },                                                    // 16
                { {16}, {6}, {18, 22} },                                            // 22
                { {16}, {3, 6}, {18, 22} },                                         // 3
                { {16}, {3, 6, 12}, {18, 22} },                                     // 12
                { {6, 16}, {3}, {8, 12}, {18, 22} },                                // 8
                { {6, 16}, {3}, {8, 10, 12}, {18, 22} },                            // 10
                { {6, 16}, {3}, {8, 10, 12}, {18, 20, 22} },                        // 20
                { {6, 16, 20}, {3}, {8, 10, 12}, {18}, {21, 22} },                  // 21
                { {16}, {6, 10}, {20}, {3}, {8}, {12, 13}, {18}, {21, 22} },        // 13
                { {16}, {6, 10}, {20}, {3}, {8}, {12, 13}, {17, 18}, {21, 22} },    // 17
        };

        for (int i = 0; i < 12; i++) {
            insertResults.add(Arrays.asList(res[i]));
        }
    }

    private void fillDeleteResult() {
        //tree values after insert keys
        Integer[][][] res = {
                { {16}, {10}, {20}, {3, 8}, {12, 13}, {17, 18}, {21, 22} },                  // 6
                { {10, 16, 20}, {3, 8}, {12, 13}, {17}, {21, 22} },                          // 18
                { {10, 13, 20}, {3, 8}, {12}, {17}, {21, 22} },                              // 16
                { {10, 13, 20}, {3, 8}, {12}, {17}, {21} },                                  // 22
                { {10, 13, 20}, {8}, {12}, {17}, {21} },                                     // 3
                { {13, 20}, {8, 10}, {17}, {21} },                                           // 12
                { {13, 20}, {10}, {17}, {21} },                                              // 8
                { {20}, {13, 17}, {21} },                                                    // 10
                { {17}, {13}, {21} },                                                        // 20
                { {13, 17} },                                                                // 21
                { {17} },                                                                    // 13
                { {} },                                                                      // 17
        };

        for (int i = 0; i < 12; i++) {
            deleteResults.add(Arrays.asList(res[i]));
        }
    }

    /**
     * Method: delete(K key)
     */
    @Test
    public void testDelete() throws Exception {
        BTree<Integer> bTree = new BTree<>(2);
        for (int key : keys) {
            bTree.insert(key);
        }
        fillDeleteResult();

        for (int i = 0; i < keys.size(); i++) {
            bTree.delete(keys.get(i));
            assertTrue(checkBTree(bTree, deleteResults.get(i)));
        }
    }

} 

</code></pre>