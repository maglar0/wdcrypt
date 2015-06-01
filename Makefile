
OS:=$(shell uname -s)
ifeq ($(OS),Linux)
	NPROCS?=$(shell grep -c ^processor /proc/cpuinfo)
endif
ifeq ($(OS),Darwin) # Assume Mac Os X
	NPROCS?=$(shell system_profiler | awk '/Number Of CPUs/{print $4}{next;}'}
endif
NPROCS?=1

CFLAGS_RELEASE := -O3 -DNDEBUG -s -march=armv7-a -mtune=cortex-a8 -fexpensive-optimizations -mfpu=neon -mhard-float

CROSS=arm-linux-gnueabihf

DEBUG?=0

DOWNLOADS := BOOST RLOG

BOOST_VER := boost_1_58_0
BOOST_URL := "http://sourceforge.net/projects/boost/files/boost/1.58.0/boost_1_58_0.tar.bz2/download"
BOOST_DIR := $(shell pwd)/build/$(BOOST_VER)
BOOST_ARCHIVE := $(BOOST_VER).tar.bz2
BOOST_SHA1 := 2fc96c1651ac6fe9859b678b165bd78dc211e881

RLOG_VER := rlog-1.4
RLOG_URL := "https://rlog.googlecode.com/files/rlog-1.4.tar.gz"
RLOG_DIR := $(shell pwd)/build/$(RLOG_VER)
RLOG_ARCHIVE := $(RLOG_VER).tar.gz
RLOG_SHA1 := 9cd86b4ceec3988f0a17730a8987110233797dcd

OPENSSL_VER := openssl-1.0.2a
OPENSSL_URL := "https://www.openssl.org/source/openssl-1.0.2a.tar.gz"
OPENSSL_DIR := $(shell pwd)/build/$(OPENSSL_VER)
OPENSSL_ARCHIVE := $(OPENSSL_VER).tar.gz
OPENSSL_SHA1 := 46ecd325b8e587fa491f6bb02ad4a9fb9f382f5f

FUSE_VER := fuse-2.9.3
FUSE_URL := "http://downloads.sourceforge.net/project/fuse/fuse-2.X/2.9.3/fuse-2.9.3.tar.gz"
FUSE_DIR := $(shell pwd)/build/$(FUSE_VER)
FUSE_ARCHIVE := $(FUSE_VER).tar.gz
FUSE_SHA1 := 94bd1974a9f2173ac3c2cf122f9fa3c35996b88e

ENCFS_VER := encfs-1.8.1
ENCFS_URL := "https://github.com/vgough/encfs/releases/download/v1.8.1/encfs-1.8.1.tar.gz"
ENCFS_DIR := $(shell pwd)/build/$(ENCFS_VER)
ENCFS_ARCHIVE := $(ENCFS_VER).tar.gz
ENCFS_SHA1 := 2bf03f5d28db18a502b5daf6ee83fe59fee9099c

MAKESELF_VER := makeself-2.2.0
MAKESELF_URL := "https://github.com/megastep/makeself/releases/download/release-2.2.0/makeself-2.2.0.run"
MAKESELF_DIR := $(shell pwd)/build/$(MAKESELF_VER)
MAKESELF_ARCHIVE := $(MAKESELF_VER).run
MAKESELF_SHA1 := d6876ffdfa49a2a01bad4e20898132627e0a575b

.PHONY: all
#all: build/$(ENCFS_VER)/arm-install/bin/encfs build/web/main.js build/web/main.css $(MAKESELF_DIR)/makeself.sh
all: build/wdcrypt.run



DOWNLOADS = BOOST RLOG OPENSSL FUSE ENCFS MAKESELF
EXTRACTS = BOOST RLOG OPENSSL FUSE ENCFS


define make-download-target

  downloads/$($(1)_ARCHIVE):
	mkdir -p downloads
	wget -O $$@ "$($(1)_URL)"

endef

$(foreach l,$(DOWNLOADS),$(eval $(call make-download-target,$l)))


define verify-sha1

	@if [ "$$(shasum downloads/$($(1)_ARCHIVE) | cut -b1-40)" != "$($(1)_SHA1)" ] ; then \
		echo "" ; \
		echo "Invalid SHA1 hash for file $($(1)_ARCHIVE). Try one of the following solutions:" ; \
		echo "  - Delete the file and run make again to automatically redownload it." ; \
		echo "  - Get the file from somewhere else and put in the download directory." ; \
		echo "  - Update the $(1)_ARCHIVE variable in the Makefile." ; \
		echo "" ; \
		false ; \
	fi

endef

define make-extract-target

  $($(1)_DIR)/extracted.sentinel: downloads/$($(1)_ARCHIVE)
	mkdir -p build
	rm -f $$@
	$$(call verify-sha1,$(1))
	tar -xf $$< --directory build
	touch $$@

endef

$(foreach l,$(EXTRACTS),$(eval $(call make-extract-target,$l)))



############# boost ####################


$(BOOST_DIR)/user-config.jam: patches/user-config.jam
	mkdir -p $(BOOST_DIR)
	cp $< $@


# This config works, but changed so only serialization is built (the only one required by encfs)
#		--without-python \
#		--without-context \
#		--without-coroutine \
#		--without-mpi \
#		--without-wave \
#		--without-test \
#		--without-graph \
#		--without-graph_parallel \

$(BOOST_DIR)/armbuild/stagedir/lib/libboost_serialization.a: $(BOOST_DIR)/extracted.sentinel $(BOOST_DIR)/user-config.jam
	rm -f $@
	cd $(BOOST_DIR) && ./bootstrap.sh
	cd $(BOOST_DIR) && BOOST_BUILD_PATH=armbuild NO_BZIP2=1 ./b2 \
		--with-serialization \
		--disable-filesystem3 \
		link=static \
		runtime-link=static \
		target-os=linux \
		--stagedir=armbuild/stagedir \
		--user-config=./user-config.jam \
		-j$(NPROCS) toolset=gcc



############# OpenSSL ####################

#			os/compiler:arm-linux-gnueabihf-gcc \

#			linux:"arm-linux-gnueabihf-gcc:-O3 -DNDEBUG -s -DL_ENDIAN::-D_REENTRANT::-ldl:BN_LLONG RC4_CHAR RC4_CHUNK DES_INT DES_UNROLL BF_PTR:${armv4_asm}:dlfcn:linux-shared:-fPIC::.so.\$(SHLIB_MAJOR).\$(SHLIB_MINOR)" \


# linux-armv4

# 		TARGETMARCH=arm-linux-gnueabihf \
#		BUILDMARCH=i686-pc-linux-gnu \

$(OPENSSL_DIR)/patched.sentinel: patches/openssl_Configure.patch $(OPENSSL_DIR)/extracted.sentinel
	rm -f $@
	# Generate this patch with something like the following:
	# cd build/openssl-1.0.2a_MODIFIED
	# diff ../openssl-1.0.2a/Configure Configure > ../../openssl_Configure.patch
	patch $(OPENSSL_DIR)/Configure < $<
	touch $@


$(OPENSSL_DIR)/arm-install/lib/libssl.a: $(OPENSSL_DIR)/extracted.sentinel $(OPENSSL_DIR)/patched.sentinel
	cd $(OPENSSL_DIR) && \
		CC=$(CROSS)-gcc \
		LD=$(CROSS)-ld \
		AS=$(CROSS)-as \
		./Configure \
			linux-armv7a \
			-DOPENSSL_NO_HEARTBEATS \
			-DNDEBUG \
			--prefix="$(OPENSSL_DIR)/arm-install" \
			no-engines \
			no-hw \
			no-err \
			no-npn \
			no-psk \
			no-srp \
			no-dtls \
			no-krb5 \
			no-ssl2 \
			no-ssl3 \
			no-fips \
			no-sctp \
			no-idea \
			no-rc2 \
			no-rc4 \
			no-rc5 \
			no-md2 \
			no-md4 \
			no-ripemd \
			no-mdc2 \
			no-camellia \
			no-cast \
			no-idea \
			no-comp \
			no-ec2m \
			no-ecdh
	cd $(OPENSSL_DIR) && make depend
	cd $(OPENSSL_DIR) && make install \
			CC=$(CROSS)-gcc \
			LD=$(CROSS)-ld \
			AS=$(CROSS)-as





################# rlog ###################


$(RLOG_DIR)/arm-install/lib/librlog.a: $(RLOG_DIR)/extracted.sentinel
	cd $(RLOG_DIR) && \
		CFLAGS="$(CFLAGS_RELEASE)" \
		CXXFLAGS="-O3" \
		./configure \
			--prefix="$(RLOG_DIR)/arm-install" \
			--host=arm-linux-gnueabihf \
			--build=x86-linux \
			--enable-static \
			--disable-shared \
			--disable-valgrind \
			--disable-docs
	cd $(RLOG_DIR) && make -j$(NPROCS) install		



################# fuse ######################


$(FUSE_DIR)/arm-install/lib/libfuse.a: $(FUSE_DIR)/extracted.sentinel
	CFLAGS="$(CFLAGS_RELEASE)" cd $(FUSE_DIR) && ./configure \
		--prefix="$(FUSE_DIR)/arm-install" \
		--exec-prefix="$(FUSE_DIR)/arm-install" \
		--host=arm-linux-gnueabihf \
		--disable-example \
		--disable-util
	cd $(FUSE_DIR) && make -j$(NPROCS) install



##################### encfs ####################


BOOST_CFLAGS:=-I$(BOOST_DIR)
RLOG_CFLAGS:=-I$(RLOG_DIR)/arm-install/include
RLOG_LIBS:=-L$(RLOG_DIR)/arm-install/lib -lrlog
OPENSSL_CFLAGS:=-DOPENSSL_NO_ENGINE -DHAVE_EVP_AES -D__STDC_FORMAT_MACROS \
				-I$(OPENSSL_DIR)/arm-install/include
OPENSSL_LIBS:=-L$(OPENSSL_DIR)/arm-install/lib -lssl -lcrypto
FUSE_CFLAGS:=-I$(FUSE_DIR)/arm-install/include
FUSE_LIBS:=-L$(FUSE_DIR)/arm-install/lib -lfuse


$(ENCFS_DIR)/patched.sentinel: patches/encfs_configure.ac.patch $(ENCFS_DIR)/extracted.sentinel
	rm -f $@
	# Generate this patch with something like the following:
	# cd build/encfs-1.8.1_MODIFIED
	# diff ../encfs-1.8.1/configure.ac configure.ac > ../../encfs_configure.ac.patch
	patch $(ENCFS_DIR)/configure.ac < $<
	cd $(ENCFS_DIR) && AUTOMAKE="automake --add-missing" autoreconf
	touch $@


build/$(ENCFS_VER)/arm-install/bin/encfs: \
		$(ENCFS_DIR)/patched.sentinel \
		$(BOOST_DIR)/armbuild/stagedir/lib/libboost_serialization.a \
		$(OPENSSL_DIR)/arm-install/lib/libssl.a \
		$(RLOG_DIR)/arm-install/lib/librlog.a \
		$(FUSE_DIR)/arm-install/lib/libfuse.a
	cd $(ENCFS_DIR) && \
		OPENSSL_CFLAGS="$(OPENSSL_CFLAGS)" \
		OPENSSL_LIBS="$(OPENSSL_LIBS)" \
		RLOG_CFLAGS="$(RLOG_CFLAGS)" \
		RLOG_LIBS="$(RLOG_LIBS)" \
		CFLAGS="$(CFLAGS_RELEASE) $(BOOST_CFLAGS) $(RLOG_CFLAGS) $(OPENSSL_CFLAGS) $(FUSE_CFLAGS)" \
		CXXFLAGS="$(CFLAGS_RELEASE) $(BOOST_CFLAGS) $(RLOG_CFLAGS) $(OPENSSL_CFLAGS) $(FUSE_CFLAGS)" \
		CPPFLAGS="$(CFLAGS_RELEASE) $(BOOST_CFLAGS) $(RLOG_CFLAGS) $(OPENSSL_CFLAGS) $(FUSE_CFLAGS)" \
		LDFLAGS="$(RLOG_LIBS) $(OPENSSL_LIBS) $(FUSE_LIBS)" \
		./configure \
			--prefix="$(ENCFS_DIR)/arm-install" \
			--host=arm-linux-gnueabihf \
			--disable-nls \
			--disable-rpath \
			--enable-static \
			--disable-shared \
			--with-boost-libdir="$(BOOST_DIR)/armbuild/stagedir/lib" \
			--with-boost="$(BOOST_DIR)"
	cd $(ENCFS_DIR) && make -j$(NPROCS) install




###################### web ###########################
######################################################


build/web/main.js: web/src/main.jsx
	mkdir -p build/web
	# Got an error in OS X when not running ulimit 2560 before browserify. But haven't tested if this
	# even works in a makefile.
	if [ -x $$(which ulimit) ] ; then ulimit -n 2560 ; fi
	if [ "$(DEBUG)" -eq "0" ] ; then \
		cd web && NODE_ENV=production ./node_modules/.bin/browserify -t reactify ../$< | \
			./node_modules/.bin/uglifyjs -m -o ../$@ ; \
	else \
		cd web && ./node_modules/.bin/browserify -t reactify ../$< -o ../$@ ; \
	fi
		


build/web/main_uncompressed.css: web/src/main.less
	mkdir -p build/web
	cd web && ./node_modules/.bin/lessc ../$< ../$@


build/web/main.css: build/web/main_uncompressed.css
	cd web && ./node_modules/.bin/cleancss ../$< -o ../$@




#################### dist #########################
###################################################


$(MAKESELF_DIR)/extracted.sentinel: downloads/$(MAKESELF_ARCHIVE)
	rm -rf $(MAKESELF_DIR)
	$(call verify-sha1,MAKESELF)
	sh $< --target $(MAKESELF_DIR)
	touch $@


# Things that need to be installed:
#   index.html
#   main.js
#   main.css
#   *.php
#   *.sh
#   encfs
#   encfsctl

SRC_PHP := $(wildcard web/php/*.php)
DIST_PHP := $(patsubst web/%,build/wdcrypt_install/%,$(SRC_PHP))
	
build/wdcrypt_install/php/%.php: web/php/%.php
	mkdir -p build/wdcrypt_install/php
	cp $< $@



SRC_SH := $(wildcard web/shell_scripts/*.sh)
DIST_SH := $(patsubst web/%,build/wdcrypt_install/%,$(SRC_SH))

build/wdcrypt_install/shell_scripts/%.sh: web/shell_scripts/%.sh
	mkdir -p build/wdcrypt_install/shell_scripts
	cp $< $@
	chmod a+x $@



SRC_PHP_LIB := $(wildcard web/php/lib/*.php)
DIST_PHP_LIB := $(patsubst web/%,build/wdcrypt_install/%,$(SRC_PHP_LIB))

build/wdcrypt_install/php/lib/%.php: web/php/lib/%.php
	mkdir -p build/wdcrypt_install/php/lib
	cp $< $@



build/wdcrypt_install/index.html: web/index.html
	mkdir -p build/wdcrypt_install
	cp $< $@
	
	
build/wdcrypt_install/main.js: build/web/main.js
	mkdir -p build/wdcrypt_install
	cp $< $@
	

build/wdcrypt_install/main.css: build/web/main.css
	mkdir -p build/wdcrypt_install
	cp $< $@
	


build/wdcrypt_install/encfs: build/$(ENCFS_VER)/arm-install/bin/encfs
	mkdir -p build/wdcrypt_install
	cp $< $@
	cp $(patsubst %,%ctl,$<) $(patsubst %,%ctl,$@)


build/wdcrypt_install/install.sh: etc/install.sh
	mkdir -p build/wdcrypt_install
	cp $< $@
	chmod a+x $@


build/wdcrypt_install/S47remove-mountpoints: etc/S47remove-mountpoints
	mkdir -p build/wdcrypt_install
	cp $< $@
	chmod a+x $@


build/wdcrypt.run: \
		build/wdcrypt_install/index.html \
		$(DIST_PHP) \
		$(DIST_SH) \
		$(DIST_PHP_LIB) \
		build/wdcrypt_install/main.css \
		build/wdcrypt_install/main.js \
		build/wdcrypt_install/install.sh \
		build/wdcrypt_install/encfs \
		build/wdcrypt_install/S47remove-mountpoints \
		$(MAKESELF_DIR)/extracted.sentinel
	$(MAKESELF_DIR)/makeself.sh --bzip2 --notemp build/wdcrypt_install $@ wdcrypto ./install.sh




