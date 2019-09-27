<?php
    if (!isset($_GET["url"])) {
        echo "A URL parameter is required";
        exit();
        die();
        flush();
    }

    $file_url = $_GET["url"];
    ob_clean();
    header('content-type: image/jpeg');
    header('Content-Disposition: attachment; filename="'.basename($file_url).'"');
    header('Content-Transfer-Encoding: binary');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    
    readfile($file_url); //Absolute URL
    
    exit();
?>