"""Browser UI contracts with simulated signaling and face replies (no hardware)."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

MOCK = r"""
localStorage.setItem('username','page_test');
window.speechCalls=[]; speechSynthesis.speak=u=>window.speechCalls.push(u.text);
window.cameraStreams=[];
navigator.mediaDevices.getUserMedia=async()=>{
 const c=document.createElement('canvas');c.width=1280;c.height=720;
 c.getContext('2d').fillRect(0,0,1280,720);const s=c.captureStream(15);
 window.cameraStreams.push(s);return s;
};
const NativeSocket=window.WebSocket;
window.WebSocket=class {
 constructor(url) {
  if(!url.includes('/ws/webrtc/'))return new NativeSocket(url);
  window.jumpSocket=this;this.readyState=1;setTimeout(()=>this.onopen?.(),0);
 }
 send(data){if(JSON.parse(data).type==='offer')setTimeout(()=>{
  this.emit({type:'answer',sdp:'fake'});
  window.jumpPeer.connectionState='connected';window.jumpPeer.onconnectionstatechange();
 },0)}
 emit(data){this.onmessage?.({data:JSON.stringify(data)})}
 close(){this.readyState=3}
};
window.RTCPeerConnection=class {
 constructor(){window.jumpPeer=this;this.connectionState='new'}
 addTrack(){}
 async createOffer(){return {sdp:'fake',type:'offer'}}
 async setLocalDescription(v){this.localDescription=v}
 async setRemoteDescription(){}
 close(){this.connectionState='closed'}
};
"""

def main(args):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=args.browser,headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1000});page.add_init_script(MOCK)
  page.route('**/api/standjump/start/?*',lambda r:r.fulfill(json={'success':True}))
  page.route('**/api/standjump/stop/?*',lambda r:r.fulfill(json={'success':True}))
  page.goto(args.url,wait_until='networkidle')
  page.evaluate("""window.videoReloads = 0;
   const video = document.querySelector('video');
   for (const event of ['emptied', 'loadstart']) {
    video.addEventListener(event, () => window.videoReloads++);
   }""")
  page.get_by_role('button',name='开启摄像头',exact=True).click()
  page.wait_for_function('window.jumpSocket && window.jumpPeer.connectionState === "connected"')
  assert page.get_by_role('button',name='开启摄像头',exact=True).is_disabled()
  assert page.locator('.status-score strong').inner_text()=='-'
  assert page.evaluate('document.querySelector("video").srcObject === window.cameraStreams[0]')
  page.evaluate("""window.jumpSocket.emit({type:'loaded',value:true});
   const stream=window.cameraStreams[0].clone();window.mockRemote=stream;
   window.jumpPeer.ontrack({streams:[stream]});
   window.jumpSocket.emit({type:'data',data:{state:'WAITING_READY',face:{state:'checking',ok:false}}});""")
  page.wait_for_function('document.querySelector("video").srcObject === window.mockRemote')
  def data(payload): page.evaluate('(data)=>window.jumpSocket.emit({type:"data",data})',payload)
  page.wait_for_timeout(200)  # Let the initial local-to-remote switch settle.
  reloads = page.evaluate('window.videoReloads')
  for _ in range(20):
   data({'state':'WAITING_READY','face':{'state':'checking','ok':False}})
   page.wait_for_timeout(65)
  assert page.evaluate('window.videoReloads') == reloads, 'Result messages reloaded the video'
  data({'state':'ARMED','face':{'state':'checking','ok':False}})
  assert not any('可以' in x for x in page.evaluate('window.speechCalls'))
  data({'state':'WAITING_READY','face':{'state':'failed','ok':False,'fail_count':3}})
  page.get_by_text('人脸识别未通过，请面向摄像头重试',exact=True).wait_for()
  data({'state':'ARMED','face':{'state':'passed','ok':True,'registered':False,'fail_count':3}})
  page.get_by_text('未注册学生，已按当前规则放行',exact=True).wait_for()
  data({'state':'ARMED','face':{'state':'passed','ok':True,'registered':False,'fail_count':3}})
  assert '未通过' not in page.locator('.prompt-message').inner_text()
  result={'state':'RESULT','session_id':'one','score_cm':123.45}
  data(result);data(result)
  assert page.locator('.status-score strong').inner_text()=='123.45 cm'
  assert page.evaluate('window.jumpChartClass.getChart(document.querySelector("canvas")).data.datasets[0].data.length')==1
  page.get_by_role('button',name='关闭摄像头',exact=True).click()
  page.wait_for_function('window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
  data({'state':'RESULT','score_cm':999,'session_id':'old'})
  assert page.locator('.status-score strong').inner_text()=='123.45 cm'
  assert page.evaluate('document.querySelector("video").srcObject === null')
  args.output.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(args.output/'page-contracts.png'),full_page=True)
  report={'passed':True,'checks':['local preview','remote readiness','stable video across 20 result messages','duplicate start','face checking/failed/unregistered/passed','face speech gate','score deduplication','null score','stop tracks','ignore late replies']}
  (args.output/'page-contracts.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
  print(json.dumps(report));browser.close()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--browser',required=True);parser.add_argument('--url',default='http://127.0.0.1:15173/tests/jump-browser.html');parser.add_argument('--output',type=Path,required=True)
 main(parser.parse_args())
