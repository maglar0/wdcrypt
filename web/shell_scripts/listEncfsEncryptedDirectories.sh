#!/bin/sh

# Looks for .encfs*.xml files and returns the names
# of those directories without leading .


find /media/sdb1 -maxdepth 2 -mindepth 2 -type f -name ".encfs*.xml" -print \
        | sed -e "s/.*\\/\\.\([^/]*\)\\/\\.encfs..xml/\1/g" | sort

