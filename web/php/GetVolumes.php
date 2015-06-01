<?php

require 'lib/InterExec.php';

// Execute to get the volumes
$exec = new InterExec('/home/root/wdcrypt/shell_scripts/listEncfsEncryptedDirectories.sh');

$volumes = "";
$error = "";

$exec->on('output', function($exec, $data) {
    global $volumes;
    $volumes = $volumes . $data;
});

$exec->on('error', function($exec, $data) {
    global $error;
    $error = $error . $data;
});

$exec->run();

// Report error if encountered

if ($error != "") {
    echo '{"error":' . json_encode($error) . "}";
    die;
}

// No error, get the volumes and for each one find number of mount points.
// Stream result to client.

ob_end_flush();
ini_set("output_buffering", "0");
ob_implicit_flush(true);

echo '{"success":[';

$v = explode("\n", $volumes);
natcasesort($v);

$initialCommaUnlessFirstElement = "";

foreach ($v as $volumeName) {
    if ($volumeName != "") {
    
        $exec = new InterExec('/home/root/wdcrypt/shell_scripts/getNumMountPoints.sh ' . $volumeName);

        $stdout = "";
        $stderr = "";

        $exec->on('output', function($exec, $data) {
            global $stdout;
            $stdout = $stdout . $data;
        });

        $exec->on('error', function($exec, $data) {
            global $stderr;
            $stderr = $stderr . $data;
        });

        $exec->run();

        if ($stderr != "") {
            echo $initialCommaUnlessFirstElement . json_encode(array(
                    "name" => $volumeName,
                    "error" => $stderr));
        }
        else {
            echo $initialCommaUnlessFirstElement . json_encode(array(
                    "name" => $volumeName,
                    "numMountPoints" => intval($stdout)));
        }
        
        $initialCommaUnlessFirstElement = ",";
    }
}

echo "]}";

?>

