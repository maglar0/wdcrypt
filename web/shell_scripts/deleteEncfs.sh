#!/bin/sh

# Delete encfs volume
# $1 = name (e.g. "vault")

ENCFS=/home/root/encfs/encfs

MOUNTDIRS="/media/sdb1 /DataVolume /var/ftp/Public"

if [ "$1" == "" ] ; then
    echo "Missing volume name" >&2
    exit 1
fi

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"

    if [ "$(mount | grep ^encfs\ on\ $MOUNT_POINT\ type)" ] ; then
        umount "$MOUNT_POINT"
        ERRORLEVEL="$?"
        if [ "$ERRORLEVEL" != "0" ]; then
            echo "umount returned error $ERRORLEVEL" >&2
            exit 1
        fi
    fi
done

rm -R -f "/media/sdb1/.$1"
