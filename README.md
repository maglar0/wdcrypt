# wdcrypto


## Overview

Easy to use encryption on the [Western Digital MyPassport Wireless](http://www.wdc.com/en/products/products.aspx?id=1330) series of hard drives. A few simple steps to install, then manage everything with a web GUI.

This is purely a hobby project and in no way endorsed by or associated with Western Digital.


## Installation

1. Copy the wdcrypt.run file to the root of your WD hard drive.
2. Log in on the hard drive using ssh (you have to enable this feature in the hard drive web GUI first)
  * On Mac and Linux, type "ssh root@192.168.60.1" in a terminal and enter password "welc0me".
  * On Windows, use [PuTTY](http://www.chiark.greenend.org.uk/~sgtatham/putty/) in a similar fashion
3. Type "sh /media/sdb1/wdcrypt.run"
4. If everything went well, you can go to [http://192.168.60.1/crypto/](http://192.168.60.1/crypto/) and manage (create/delete/mount/unmount) encrypted volumes.


## Stability

I have used it for months without any issues, but I have only tested on my own device. The software obviously comes without any warranty what so ever.


## Performance

I only get about 6 MB/s without encryption on the WD MyPassport over WiFi. It gets somewhat lower when using encryption, the speed seems to vary between 4-6 MB/s.


## Uninstall

There is no way to easily uninstall. Look at the file etc/install.sh to see what directories the installer creates and where it copies files. It does not overwrite anything. Do note however that when creating a volume, the directory where it is mounted is added to the file /usr/local/wdmcserver/bin/wdmc.xml in order to prevent indexing and thumbnail generation of your encrypted files. Nothing will be automatically removed from that file so you have to undo those changes yourself.

However, you might not have to uninstall. I don't think it will cause any problems or performance degradation or other negative effects by simply being installed if you don't use it.


## Security

It uses [EncFS](https://github.com/vgough/encfs) for the encryption, which does have a few downsides compared to other encryption software which you might want to be aware of. It should be secure enough for many use cases though and I (obviously) use it myself. If you want to learn more about it, [search](https://www.google.com/search?hl=en&q=security+encfs).
