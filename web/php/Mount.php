<?php

    require 'lib/ExecStream.php';

    $exec = new ExecStream("/home/root/wdcrypt/shell_scripts/mountEncfs.sh " .
                        $_POST["name"] . " " .
                        $_POST["password"]);
    
    $exec->run();

?>
