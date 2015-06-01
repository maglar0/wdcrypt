<?php

    require 'lib/ExecStream.php';

    if ($_POST["cipher"] == "AES") {
        $cipher = 1;
    }
    else if ($_POST["cipher"] == "Blowfish") {
        $cipher = 2;
    }
    else {
        die("Invalid cipher " . $_POST["cipher"]);
    }

    $exec = new ExecStream("/home/root/wdcrypt/shell_scripts/createEncfs.sh " .
                        $_POST["name"] . " " .
                        $cipher . " " .
                        $_POST["keysize"] . " " .
                        $_POST["blocksize"] . " " .
                        $_POST["filenameencoding"] . " " .
                        $_POST["password"]);
    
    $exec->run();

?>