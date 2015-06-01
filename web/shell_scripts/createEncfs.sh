#!/bin/sh

# Create an encfs volume in /media/sdb1/.$1
# $1 - volume name. Only alphanumeric characters, no spaces, slashes etc.
# $2 - 1 for AES, 2 for Blowfish
# $3 - keysize (depends on cipher, for AES 128, 192, or 256)
# $4 - blocksize (16 to 4096 and divisible by 16)
# $5 - Filename encoding algorithm (1, 2, 3, or 4)
# $6 - Password

if [ "$1" == "" ] ; then
    echo "Missing volume name" >&2
    exit 1
fi

if [ "$2" == "1" ]; then
    if [ "$3" != "128" -a "$3" != "192" -a "$3" != "256" ]; then
        echo "Invalid key size, must be 128, 192, or 256" >&2
        exit 1
    fi
elif [ "$2" == "2" ]; then
    # TODO Test Blowfish key size
    exit 1
else
    echo "Cipher must be 1 (AES) or 2 (Blowfish)" >&2
    exit 1
fi

if [ "$4" == "" ]; then
    echo "No blocksize given" >&2
    exit 1
fi

if [ "$5" == "" ]; then
    echo "No filename encoding algorithm given" >&2
    exit 1
fi

if [ "$6" == "" ]; then
    echo "No password given" >$2
    exit 1
fi



ENCFS=/home/root/encfs/encfs

MOUNTDIRS="/media/sdb1 /DataVolume /var/ftp/Public"

for CONTAINING_DIR in $MOUNTDIRS ; do
    MOUNT_POINT="$CONTAINING_DIR/$1"
    if [ -e "$MOUNT_POINT" ] ; then
        echo "$MOUNT_POINT already exists" >&2
        exit 1
    fi

    SOURCE_DIR="$CONTAINING_DIR/.$1"
    if [ -d "$SOURCE_DIR" ] ; then
        echo "$SOURCE_DIR already exist" >&2
        exit 1
    fi
done

echo -e "y\ny\nx\n$2\n$3\n$4\n$5\nn\ny\nn\n0\ny\n$6" \
        | $ENCFS -S --public "/media/sdb1/.$1" "/media/sdb1/$1"

ERRORLEVEL="$?"
if [ $ERRORLEVEL != "0" ]; then
    echo "encfs returned errorlevel $ERRORLEVEL when creating volume and mounting in /media/sdb1/$1"
    exit $ERRORLEVEL
fi

echo $6 | $ENCFS -S --public "/media/sdb1/.$1" "/DataVolume/$1"

ERRORLEVEL="$?"
if [ $ERRORLEVEL != "0" ]; then
    echo "encfs returned errorlevel $ERRORLEVEL when mounting volume in /DataVolume/$1"
    exit $ERRORLEVEL
fi

echo $6 | $ENCFS -S --public "/media/sdb1/.$1" "/var/ftp/Public/$1"

ERRORLEVEL="$?"
if [ $ERRORLEVEL != "0" ]; then
    echo "encfs returned errorlevel $ERRORLEVEL when mounting volume in /var/ftp/Public/$1"
    exit $ERRORLEVEL
fi



# Prevent twonkyserver from indexing directory
IGNORE_THIS="/media/sdb1/$1/.ignorethis"
echo "Creating file $IGNORE_THIS to stop Twonky media server from indexing directory"
touch "$IGNORE_THIS"


# Stop WDMC from indexing
WDMC_XML="/usr/local/wdmcserver/bin/wdmc.xml"
WDMC_CRYPTO_XML="/usr/local/wdmcserver/bin/wdmc_crypto.xml"
echo "Updating $WDMC_XML to stop WDMC Server from indexing directory"
cat "$WDMC_XML" | \
        sed "s/<ExcludePatterns>/<ExcludePatterns>\n\t\t\t<ExcludePattern>\/$1<\/ExcludePattern>/" \
        > "$WDMC_CRYPTO_XML"
rm "$WDMC_XML"
mv "$WDMC_CRYPTO_XML" "$WDMC_XML"


