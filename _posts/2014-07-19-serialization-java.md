---
layout: post
type: quote
title: 关于java序列化
description: "The serialization in Java"
modified: 2014-07-19
tags: [java]
imagefeature: cs-7.jpg
category: Javadevelopment
comments: true
share: true
---

> "普遍存在这样一种误解，认为程序员毫不费力就可以实现序列化。"
> <small><cite title = "effecitive java">《Effective Java》 </cite></small>

###关于序列化

序列化就是将一个对象编码为字节流，使得可以通过网络传输或者存储到磁盘上。
将字节流反编码为对象的过程称为反序列化。

###序列化的基本使用

Java中，要使用序列化非常简单：

- 1.需要序列化的类实现``java.io.Serializable``接口
- 2.使用ObjectOutputStream将对象序列化输出

而对于反序列化，则只需构造ObjectInputStream，然后使用readObject方法即可反序列化即可。而Serializable接口没有任何方法，所以实现该接口不需要做任何事情，看起来时如此的简单。


如下，java序列化的基本使用的Demo：

{% highlight java %}

public class BasicDemo {

    private static class Person implements Serializable {

        private static final long serialVersionUID = 9175036933185692367L;
        private String name;
        public Person(String name){
            this.name = name;
        }
        @Override
        public String toString() {
            return "Person " + name;
        }
    }
 
public static void main(String[] args) throws IOException, ClassNotFoundException {
        Person person = new Person("Kitty");
        File file = new File("d:\\person");
        if (file.exists()){
            file.createNewFile();
        }
        System.out.println("Person to be serialized: " + person);
        //serialization
        ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(file));
        oos.writeObject(person);
        oos.flush();
        oos.close();

        //deserialization
        ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
        Person dePerson = (Person)ois.readObject();
        ois.close();
        System.out.println("Person deserialized :" + dePerson);
    }
    
}

{% endhighlight %}

既然序列化不需要程序员做任何工作，为何非得要显示的实现该接口才可以使用ObjectOutputStream序列化输出，而不是默认实现呢。

因为允许序列化，也就意味中该类序列化之后的字节码也变成的该类导出API的一部分。并且如若没有认真处理这种关系，将使得该类的演变变得异常艰难，甚至变成是不可能的事情。

在类的实现中有一条原则：“暴露接口，影藏实现”。也就是暴露出的功能与内部实现解耦，使得以后可以使用其他的实现方式来提供原有的功能。但是默认的序列化机制却会完全的破坏该原则。默认的java序列化算法与类的实现密切相关，类的很小的变化都很可能导致字节码的不兼容，并且更严重的事情是，它会将你的内部实现机制也暴露出去，使得在以后的版本里面，无法修改。

例如，一个类中包含了一个LinkedList，使用默认序列化机制以后，想使用ArrayList替换原有实现也将变得不可能。

总结起来，允许序列化之后，将有几个影响（来自《effective java》）：

- 1.一旦一个类被发布，就大大的降低了“修改该类实现”的灵活性。
- 2.增加了出现Bug和安全漏洞的可能性
- 3.随着版本的演进，相关的测试工作会增加


java内置的序列化是允许重构的，但是也很有限。

也就是说一个类的实例序列化成字节码之后，该类的结构有了变化，比如新增了属性等，那么也可以从之前的字节码反序列化出变化之后的类的实例。

这种重构也是有限制的，只对于如下三种情况有效：

- 1.向类中添加新的域
- 2.将域从静态修改为非静态
- 3.将域从transient修改为非transient

对于其他情况，则会抛出异常。

对于上述的重构情况，新添加的属性在序列化之后会初始化为默认值：对于引用类型为null，boolean为false，原生类型为0。

还有一个需要注意的是，要实现上述的重构支持，必须显示的在类中申明`serialVersionUID`属性，并且它的修饰符必须为`static final long`，同时保证重构前后类的该属性相等。

`serialVersionUID`用于指定类的演变版本，同一个版本之间可以序列化与反序列化，不同版本之间不允许。该属性可以不显示的指定，此时编译器会根据类的元信息计算出一个ID号。但是建议每一个允许序列化的类都显示的指定该属性，因为ID的计算根据不同的编译器有所差异，可能导致同样的class却有不停的UID；另一个原因是可以节省序列化的时间，因为该UID的计算时比较耗时的。

另外java的序列化中，有几个隐藏的回调方法

{% highlight java %}

private void writeObject(java.io.ObjectOutputStream out) throws IOException;

private void readObject(java.io.ObjectInputStream in) throws IOException, ClassNotFoundException;

ANY-ACCESS-MODIFIER Object writeReplace() throws ObjectStreamException;

ANY-ACCESS-MODIFIER Object readResolve() throws ObjectStreamException;

{% endhighlight %}

writeObject允许对序列化进行一些自定义，而readObject方法就需要与自定义的writeObject允许对序列化进行一些自定义相对应，使得可以反序列化出原有对象。

writeRepalce使得可以使用序列化代理，而readResolve与其对应，使得可以从代理中恢复出原有对象。

还有一个与序列化相关的关键字`transient`，该关键字修饰的域将不会被默认序列化机制序列化输出，该关键字使得可以自定义序列化机制。

### 序列化的安全问题

对于一些敏感的对象，例如存储了用户账户的对象，将其直接序列化出之后，该账户的一些敏感属性将直接暴露在字节码中，变得极其不安全。所以，对于一些敏感属性，可以将其先加密，然后序列化，在反序列化时候，在进行解密。

如下是一个简单的例子，敏感的对象为Person，敏感的属性为age，因为女生的年龄是个秘密。

{% highlight java %}

class Person implements Serializable{
        private static final long serialVersionUID = -5383832422447119470L;
        private String name;
        private int age;

        public Person(String name,int age){
            this.name = name;
            this.age = age;
        }

        private void encrypt(){
            //encrypt age
            age = age << 2;
        }

        private void deocde(){
            //decode age
            age = age >>2;
        }

        private void writeObject(java.io.ObjectOutputStream out)
                throws IOException {
            encrypt();
            out.defaultWriteObject();
        }

        private void readObject(java.io.ObjectInputStream in)
                throws IOException, ClassNotFoundException{
             in.defaultReadObject();
             deocde();
        };

        @Override
        public String toString() {
            return String.format("Person [name: %s, age: %d]",name,age);
        }
}

{% endhighlight %}

Person实现中，实现了writeObject以及readObject方法，使得在序列化之前对Person部分属性进行加密，而在反序列化之后进行解密。

在Person中，序列化之前使用encrypt方法对年龄进行加密，我这里的加密方式当然很简单，你可以实现更加复杂的方法（例如 age = age -18,每个女人都如此年轻）等等。

另外，序列化和clone机制一样，是一种不需要构造函数而产生对象的方式，也就使得产生的对象可能会逃避某些有效性检查，比如Person中age必须非负数，并且也可能使得一个对象在没有完全初始化的情况下，过早的暴露出去（并发情况下）。

java默认的序列化字节码可以在<a href= "http://docs.oracle.com/javase/7/docs/platform/serialization/spec/serialTOC.html">java object serialization</a>中查询相关描述信息，也就意味这你可以自己来伪造序列化字节码。

解决上述方法，或许可以将readObject方法实现为私有，禁止外部序列化，但是该方法有两个问题：

- 1.可以使用反射访问到该方法
- 2.可以通过伪造字节码，暴露出对象内部的某些域的引用，在该类初始化并通过有效性检查后偷偷的破坏内部对象（如同在你的身份证中嵌入恶意芯片，尽管身份证藏在你兜里，但是别人却可以通过该芯片远程知晓你的身份信息）。

如下例：

{% highlight java %}

class Period implements Serializable{
        private static final long serialVersionUID = -1784011910342149200L;

        private  Date start;
        private  Date end;

        public Period(Date start,Date end){
            this.start = start;
            this.end = end;
        }

        private void verify() throws InvalidObjectException {
            if (end.before(start)){
                throw new InvalidObjectException("end should not before start");
            }
        }

        private void readObject(java.io.ObjectInputStream in)
                throws IOException, ClassNotFoundException{
            in.defaultReadObject();
            start = new Date(start.getTime());
            end = new Date(end.getTime());
            verify();
        }
    }

{% endhighlight %}

上例中Period表示一个时间区间，它的有效性也就是开始时间不能晚于结束时间。

反序列化时，首先使用defaultReadObject反序列化出对象，为了避免直接反序列化出的对象中，可能存在的start和end属性引用暴露，接着使用拷贝，重新初始化对象的属性，使得该对象的start和end对象的引用不可能暴露出去，最后检查区间的有效性。这种方法遗憾的地方就是，域不能为final。

###序列化代理

举例说，当要序列化A对象时，使用A的代理对象B的序列化结果作为A的序列化结果输出，而在反序列化时，再使用反序列化出的B对象生成A对象，有些类似构造模式。

看似有些怪异，但是这种方式有不少的好处：

- 1.可以允许序列化对象的域为final
- 2.可以做到很好的安全性

一般情况下，一个类的序列化代理类都申明为该类的内部私有静态类，这样就禁止了外部对该类的访问，当然也就使得无法通过反射或则其他方式直接调用readObject产生未经检查的对象；并且序列化代理采用拷贝赋值之后，也可以避免伪造字节码泄露内部对象引用的危险。

使用序列化代理，则需要使用上面提到的writeReplace和readResolve方法。writeReplace返回一个类的序列化代理，而readResolve方法从反序列化出的代理中获取到需要的对象。

如下是一个demo:

{% highlight java %}

class Person implements Serializable{
        private final String name;
        private final int age;

        public Person(String name,int age){
            this.name = name;
            this.age = age;
        }

        private static class PersonProxy implements Serializable{
            private static final long serialVersionUID = 6679468263480124365L;
            private String name;
            private int age;

            public PersonProxy(Person person){
                this.name = person.name;
                this.age = person.age;
            }

            private Object readResolve() throws ObjectStreamException{
                return new Person(name,age);
            }
        }

        private Object writeReplace() throws ObjectStreamException {
            return new PersonProxy(this);
        }
    }

{% endhighlight %}

注意两个方法所在的位置：writeReplace在实际的类中，而readResolve在代理类中。

###自定义序列化

java默认的序列化机制不一定高效，也不是万能的。它可能会将一些不必要的属性序列化输出，例如链表中的引用，同样它不一定保证序列化之后的对象正确，比如对于HashMap。所以很多时候，需要实现自定义的序列化。

至于何种情况下使用默认，何种情况下使用自定义，effective java中的看法是，如果类的物理意义与其逻辑意义一致，则可能适合默认实现，而对于不一致的情况，最好自定义实现。

例如，对于上述例子中的Person类，它的物理意义和逻辑意义是一致的，它仅仅存储了一些属性，而这些属性也代表了它的逻辑意义；而对于Map，它的逻辑意义是映射，物理意义可能是哈希实现，也可能是树实现，此时使用默认的序列化机制，则会将会限制物理实现。

如下是一个自定义序列化的demo：

{% highlight java %}

 class Person implements Serializable{
        private static final long serialVersionUID = 3308780890814766690L;
        private String name;

        public Person(String name){
            this.name = name;
        }

        @Override
        public String toString() {
            return name;
        }
    }

    private static class Persons implements Serializable{
        private static final long serialVersionUID = 3632886818488066643L;
        private transient List<Person> personList = new LinkedList<Person>();
        private transient int size = 0;

        public void addPerson(Person person){
            personList.add(person);
            size++;
        }

        private void writeObject(java.io.ObjectOutputStream out)
                throws IOException {
            out.writeObject(size);
            for (Person p : personList){
                out.writeObject(p);
            }
        }
        private void readObject(java.io.ObjectInputStream in)
                throws IOException, ClassNotFoundException{
            size = (int) in.readObject();
            personList = new LinkedList<>();
            for (int i = 0; i < size; i++){
                 addPerson((Person)in.readObject());
            }
        }

        @Override
        public String toString() {
            StringBuffer sb = new StringBuffer();
            sb.append("[");
            for (Person person : personList){
                sb.append(person);
                sb.append(",");
            }
            if (sb.length() > 1){
                sb.deleteCharAt(sb.length() -1);
            }
            sb.append("]");
            return sb.toString();
        }
    }

{% endhighlight %}

例子中的Persons，表示一个Person的集合，这是它的逻辑意义。而它的实现使用了一个链表来存储这个集合，这是它的物理意义。若使用默认的序列化机制，那么该物理意义也就无法修改，也就是你无法使用其他的容器，比如ArrayList来代替链表。

例子中，首先将全部域使用transient修饰，使得默认实现不会去输出这些域，然后按照自定义的方式将域输出。如此，就使得序列化出的字节码与该对象的物理实现解耦。

当然，也不必一定做得这么绝，把所有的域都申明为transient。像java的容器，则将某一些域使用默认序列化机制，然后其他与需要与物理实现解耦的地方使用自定义序列化机制。

### Hadoop的序列化

Hadoop实现了一套完全自己的序列化机制，不使用java的机制的原因就是，自带的机制输出结果比较大，而Hadoop经常需要将这些序列化结果通过网络传输，所以序列化输出的结果大小至关重要。

Hadoop的序列化接口为Writable，申明如下：

{% highlight java %}
void	readFields(DataInput in)；
void	write(DataOutput out) ；
{% endhighlight %}

一个负责序列化，一个负责反序列化。


如下是一个使用这种序列化机制的示例：
{% highlight java %}
public class MyWritable implements Writable {
       // Some data     
       private int counter;
       private long timestamp;
       
       public void write(DataOutput out) throws IOException {
         out.writeInt(counter);
         out.writeLong(timestamp);
       }
       
       public void readFields(DataInput in) throws IOException {
         counter = in.readInt();
         timestamp = in.readLong();
       }
       
       public static MyWritable read(DataInput in) throws IOException {
         MyWritable w = new MyWritable();
         w.readFields(in);
         return w;
       }
     }
{% endhighlight %}

在Java的序列化机制中，需要将类的元数据，以及域的元数据，比如类型，长度等输出到序列化结果中，而在hadoop的序列化机制中，这些统统不需要，只需要序列化域的值即可，当然也就减少了序列化结果的大小。

当然，这样的方式也使得，程序员必须很清楚，流中的字节码是对应的哪一个类型，否则将束手无策。同样，这种方式也完全没有版本的概念，不同版本的序列化结果是不兼容的。当然，Hadoop自身有很强的版本控制，网络传输也有很好的协议控制，使得上述两个问题都可以解决。尽管这样麻烦了一些，但是为了性能，倒也值了。

EOF.