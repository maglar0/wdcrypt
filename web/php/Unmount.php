<?php

    require 'lib/ExecStream.php';

    $exec = new ExecStream("/home/root/wdcrypt/shell_scripts/unmountEncfs.sh " .
                        $_POST["name"] . " " .
                        $_POST["restartfilesharing"]);
    
    $exec->run();

?>
