---
layout: post
title: Java资源读取相关
description: "About the resources in java"
modified: 2014-08-02
tags: [java,application]
imagefeature: cs-7.jpg
category: Javadevelopment
comments: true
share: true
---
参考:<a href="http://javarevisited.blogspot.com/2014/07/how-to-load-resources-from-classpath-in-java-example.html">How to Load Resources from Classpath in Java with Example.</a>


##关于资源
Java应用中，经常需要一些资源文件，例如配置文件，图片等等。在发布应用的时候，这些文件常常需要直接打包到Jar，并且在程序中进行读取。

若需要这些资源文件打包到Jar文件中，则需要将这些资源文件放到项目的资源文件夹（一般名为resources）下。

##Properties类

该类是java提供的配置管理的类，完整包名为java.util.Properties。主要有如下几个方法：

{% highlight %}

void load(InputStream in);      //读取java格式的配置文件
void loadFromXml(InputStream in); //读取XML格式的配置文件
String getProperty(String key);   //获取一个配置项的值

{% endhighlight %}

###Java格式的配置文件

exp:
>name = kali
>age = 24

每一个配置项占一行，key在前，value在后，以‘=’分隔。

###XML格式的配置文件

exp:
{% highlight %}

<properties>
<entry key="name">kali</entry>
<entry key="age">24</entry>
</properties>

{% endhighlight %}

##资源读取

示例：
{% highlight %}

	public class ReadingResource {
    private static final String FILE_NAME = "/app.properties";

    private static void  method1() throws IOException {
        Properties conf = new Properties();
        InputStream inputStream = ReadingResource.class.getResourceAsStream(FILE_NAME);
        conf.load(inputStream);
        inputStream.close();
        System.out.println(conf.get("age"));
    }

    private static void method2() throws IOException {
        Properties conf = new Properties();
        URL resourceURL = ReadingResource.class.getResource(FILE_NAME);
        conf.load(resourceURL.openStream());
        System.out.println(conf.get("name"));
    }

    public static void main(String[] args) throws IOException {
       method1();
       method2();
    }
	}

{% endhighlight %}

值得注意的是，如果资源文件没有找到，getResourceAsStream()以及getResource()方法会返回null，而不是抛出受检查的异常。

另外一点就是资源文件的名字（例子中FILE_NAME）,若名字以"/"开头，则表示配置文件在resources文件夹下，否则表示在resources对应的类的包名解析为目录下。

例如，上例子中的资源文件只需要放到resouces文件夹下即可，如果FILE_NAME="app.properties",该类的包名为com.test，那么配置文件的存放路径就需要为/resources/com/test/app.properties

EOF.