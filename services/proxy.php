<?php
$url = $_GET['url'];
$params = array();
foreach ($_GET as $k => $v)
{	if ($k != 'url') array_push ($params, urlencode($k).'='.urlencode($v));
}
if (preg_match("/\?/", $url)) $url .= '&';
else $url .= '?';
$url .= implode('&',$params);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//curl_setopt($ch, CURLOPT_USERAGENT, 'xxx');
curl_setopt($ch, CURLOPT_REFERER, 'http://'.$_SERVER['HTTP_HOST']);
echo curl_exec ($ch);
curl_close($ch);
?>