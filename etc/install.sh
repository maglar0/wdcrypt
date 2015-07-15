#!/bin/sh

# Installation script for the wdcrypt software for Western Digital MyPassport Wireless



check_directory_exists() {
    if [ ! -d "$1" ]; then
        echo ""
        echo "Directory $1 does not exist. "
        echo "Your Western Digital MyPassport Wireless does not appear to have the same firmware "
        echo "as the one used for developing this encryption software. This installer can thus "
        echo "not continue with the installation."
        exit 1
    fi        
}

check_file_exists() {
    if [ ! -f "$1" ]; then
        echo ""
        echo "File $1 does not exist. "
        echo "Your Western Digital MyPassport Wireless does not appear to have the same firmware "
        echo "as the one used for developing this encryption software. This installer can thus "
        echo "not continue with the installation."
        exit 1
    fi        
}

check_installation_prerequisites() {
    check_directory_exists "/var/www"
    check_directory_exists "/home/root"
    check_directory_exists "/media/sdb1"
    check_directory_exists "/DataVolume"
    check_directory_exists "/var/ftp/Public"
    check_directory_exists "/etc/init.d"

    check_file_exists "/usr/local/wdmcserver/bin/wdmc.xml"
}


do_install() {
    mkdir -p /home/root/wdcrypt
    mv -i encfs /home/root/wdcrypt
    mv -i encfsctl /home/root/wdcrypt
    
    mkdir -p /home/root/wdcrypt/shell_scripts
    mv -i shell_scripts/* /home/root/wdcrypt/shell_scripts
    
    mkdir -p /var/www/crypto
    mv -i php/*.php /var/www/crypto

    mkdir -p /var/www/crypto/lib
    mv -i php/lib/* /var/www/crypto/lib

    mv -i main.js /var/www/crypto
    mv -i main.css /var/www/crypto
    mv -i index.html /var/www/crypto

    mv -i S47remove-mountpoints /etc/init.d

    rmdir php/lib
    rmdir php
    rmdir shell_scripts
    rm install.sh
    cd .. && rmdir wdcrypt_install
}


check_installation_prerequisites

do_install

echo ""
echo "Installation complete. Start using it by browsing to http://192.168.60.1/crypto"
echo ""
