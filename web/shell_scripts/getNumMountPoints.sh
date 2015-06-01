#!/bin/sh

# Prints an integer between 0 and 3 which is the number of mount points where
# the volume $1 is currently moutned.


MOUNTDIRS="/media/sdb1 /DataVolume /var/ftp/Public"

SOURCE_DIR="/media/sdb1/.$1"
SOURCE_ENCFS_FILE="$SOURCE_DIR/.encfs6.xml"

if [ "$1" == "" ] ; then
    echo "Missing volume name" >&2
    exit 1
fi

if [ ! -f "$SOURCE_ENCFS_FILE" ]; then
    echo "$SOURCE_ENCFS_FILE does not exist" >&2
    exit 1
fi


NUM_MOUNTED=0

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"
    if [ "$(mount | grep ^encfs\ on\ $MOUNT_POINT\ type )" ] ; then
        NUM_MOUNTED=$(( $NUM_MOUNTED + 1 ))
    fi
done

echo $NUM_MOUNTED
