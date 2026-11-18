// Pagadito-supplied cybs_devicefingerprint.js (DeviceFingerprint.zip).
// The certification UI invokes this only after the user consents to the test.
export const pagaditoDeviceFingerprintScript = String.raw`
function cybs_dfprofiler(merchantID,environment)
{
 if (environment.toLowerCase() == 'live') {
  var org_id = 'k8vif92e';
 } else {
  var org_id = '1snn5n9w';
 }
 var sessionID = new Date().getTime();
 var paragraphTM = document.createElement("p");
 var str = "background:url(https://h.online-metrix.net/fp/clear.png?org_id=" + org_id + "&session_id=" + merchantID + sessionID + "&m=1)";
 paragraphTM.styleSheets = str;
 paragraphTM.height = "0";
 paragraphTM.width = "0";
 paragraphTM.hidden = "true";
 document.body.appendChild(paragraphTM);
 var img = document.createElement("img");
 str = "https://h.online-metrix.net/fp/clear.png?org_id=" + org_id + "&session_id=" + merchantID + sessionID + "&m=2";
 img.src = str;
 document.body.appendChild(img);
 var tmscript = document.createElement("script");
 tmscript.src = "https://h.online-metrix.net/fp/check.js?org_id=" + org_id + "&session_id=" + merchantID + sessionID;
 tmscript.type = "text/javascript";
 document.body.appendChild(tmscript);
 var objectTM = document.createElement("object");
 objectTM.data = "https://h.online-metrix.net/fp/fp.swf?org_id=" + org_id + "&session_id=" + merchantID + sessionID;
 objectTM.width = "1";
 objectTM.height = "1";
 objectTM.id = "thm_fp";
 var param = document.createElement("param");
 param.name = "movie";
 param.value = "https://h.online-metrix.net/fp/fp.swf?org_id=" + org_id + "&session_id=" + merchantID + sessionID;
 objectTM.appendChild(param);
 document.body.appendChild(objectTM);
 return sessionID;
}
`;
