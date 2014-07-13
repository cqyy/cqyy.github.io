---
layout: post
title: Java获取汉子区位码
description: "Java获取汉子区位码"
modified: 2013-11-20
tags: [java,application]
image:
  feature: abstract-5.jpg
  credit: dargadgetz
  creditlink: http://www.dargadgetz.com/ios-7-abstract-wallpaper-pack-for-iphone-5-and-ipod-touch-retina/
comments: true
share: true
---


一个用java获取汉字区位码的简单方式。

一个汉字占两个字节，第一个字节叫区码，第二个叫位码（简单的这么说而已）。实际在计算机存储的是机器码，所以需要将机器码转换为区位码。

首先看看区位码是怎么形成机器码的。区位码无法用于汉字通信，因为它可能与通信使用的控制码（00H~1FH）（即0~31）发生冲突。ISO2022规定每个汉字的区号和位号必须分别`加上32`（即二进制数00100000），经过这样的处理而得的代码称为国标交换码，简称交换码。由于文本中通常混合使用汉字和西文字符，汉字信息如果不予以特别标识，就会与单字节的ASCII码混淆。此问题的解决方法之一是将一个汉字看成是两个扩展ASCII码，使表示GB2312汉字的两个字节的最高位都为1。这种高位为1的双字节汉字编码即为GB2312汉字的机内码，简称为内码。

所以要获取区位码，就得对机器码每一个字节解析-0x80-0x20操作。

{% highlight java %}
import java.io.UnsupportedEncodingException;
/*
 * Get the area code of Chinese word
 * */
public class ChineseAreaCode {
	public class ToomuchWordException extends Exception{	
		private static final long serialVersionUID = 1L;
		public ToomuchWordException(){}	
		public ToomuchWordException(String message){
			super(message);
		}
	}
	/*
	 * @function get the area code Chinese word 
	 * @param word
	 * the single Chinese word to deal
	 * @UnsupportedEncodingException 
	 * throws when word is not supported
	 * @ToomuchWordException 
	 * throws when word is not a single word*/
	public String toAreaCode(String word) throws UnsupportedEncodingException,ToomuchWordException{
		if(word.length()!=1){
			/*word is not a single word*/
			throw new ToomuchWordException();
		}
		byte[] bs=word.getBytes("GB2312");
		String areaCode="";
		for(byte b:bs){
			int code=Integer.parseInt(Integer.toHexString(b & 0xff),16);
			areaCode += (code-0x80-0x20);       /*transfer the machine code to area code*/
		}
		return areaCode;
	}
	
	public static void main(String[] args) throws unsupportedEncodingException, ToomuchWordException{
		String word="袁";
		ChineseAreaCode cac = new ChineseAreaCode();
		System.out.println(cac.toAreaCode(word));
	}
}
{% endhighlight %}

>**output:** 5212