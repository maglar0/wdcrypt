#!/bin/sh

# Unmount something that was previously mounted with mountEncfs.sh
# $1 = name (e.g. "vault")
# $2 = force unmount (optional, must be 0 or 1 if present)

ENCFS=/home/root/encfs/encfs

MOUNTDIRS="/media/sdb1 /DataVolume /var/ftp/Public"

if [ "$1" == "" ] ; then
    echo "Missing volume name" >&2
    exit 1
fi

if [ "$2" != "" -a "$2" != "1" -a "$2" != "0" ] ; then
    echo "Invalid second parameter, must be 1 or 0 if present" >&2
    exit 1
fi

if [ "$2" == "1" ] ; then
    FORCE="-f"
else
    FORCE=""
fi

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"

    if [ "$(mount | grep ^encfs\ on\ $MOUNT_POINT\ type)" ] ; then
        echo "Unmounting $MOUNT_POINT"
        umount $FORCE "$MOUNT_POINT"
        ERRORLEVEL="$?"
        if [ "$ERRORLEVEL" != "0" ]; then
            echo "umount returned error $ERRORLEVEL" >&2
            exit 1
        fi
    else
        echo "$MOUNT_POINT not mounted"
    fi
done

sleep 1

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"

    if [ -d "$MOUNT_POINT" ] ; then
        rmdir "$MOUNT_POINT"
    fi
done
