#!/bin/sh

# Mount directory /media/sdb1/.$1 in the following places with password $2
# /media/sdb1/$1
# /DataVolume/$1
# /var/ftp/Public/$1

ENCFS=/home/root/encfs/encfs

MOUNTDIRS="/media/sdb1 /DataVolume /var/ftp/Public"

SOURCE_DIR="/media/sdb1/.$1"
SOURCE_ENCFS_FILE="$SOURCE_DIR/.encfs6.xml"

if [ "$1" == "" ] ; then
    echo "Missing volume name" >&2
    exit 1
fi

if [ "$2" == "" ] ; then
    echo "Missing password" >&2
    exit 1
fi


if [ ! -f "$SOURCE_ENCFS_FILE" ]; then
    echo "$SOURCE_ENCFS_FILE does not exist" >&2
    exit 1
fi

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"
    if [ -d "$MOUNT_POINT" ] ; then
        if [ "$(ls -A $MOUNT_POINT)" ] ; then
            if [ "$(ls -A $MOUNT_POINT)" != ".wdmc" ] ; then
                if [ ! "$(mount | grep encfs\ on\ $MOUNT_POINT\ type\ fuse\\.encfs)" ] ; then
                    echo "$MOUNT_POINT is not empty, can't mount there" >&2
                    exit 1
                fi
            fi
        fi
    fi
done


for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"
    if [ ! "$(mount | grep encfs\ on\ $MOUNT_POINT\ type\ fuse\\.encfs)" ] ; then
        echo "Mounting $1 on $MOUNT_POINT"
        mkdir -p "$MOUNT_POINT"
        rm -R -f "$MOUNT_POINT/.wdmc"
        echo $2 | $ENCFS --public -S "$SOURCE_DIR" "$MOUNT_POINT"
        ERRORLEVEL="$?"
        if [ "$ERRORLEVEL" != "0" ]; then
            echo "encfs returned error $ERRORLEVEL" >&2
            exit 1
        fi
    else
        echo "$1 is already mounted on $MOUNT_POINT"
    fi
done
