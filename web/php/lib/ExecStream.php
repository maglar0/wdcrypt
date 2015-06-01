<?php

    require 'InterExec.php';


    class ExecStream {
        
        private $command_to_run = null;
    
        private $inter_exec = null;
        
        private $is_first_element = true;

        public function __construct($command_to_run) {
            $this->command_to_run = $command_to_run;
            
            $this->inter_exec = new InterExec($command_to_run);

            $this->inter_exec->on('output', function($exec, $data) {
                echo "[1," . json_encode($data) . "],";
            });
            
            $this->inter_exec->on('error', function($exec, $data) {
                echo "[2," . json_encode($data) . "],";
            });
            
            $this->inter_exec->on('stop', function($exec, $data) {
                echo json_encode(array(3, $data)) . "]";
            });
            
        }
 
        public function run() {
            ob_end_flush();
            ini_set("output_buffering", "0");
            ob_implicit_flush(true);
            
            echo "[" . json_encode(array(0, $this->command_to_run . "\n")) . ",";
            $this->inter_exec->run();
        }
    
    }


?>
