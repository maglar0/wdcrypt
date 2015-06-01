<?php

    require 'lib/ExecStream.php';

    $exec = new ExecStream("/home/root/wdcrypt/shell_scripts/deleteEncfs.sh " .
                        $_POST["name"]);
    
    $exec->run();

?>
