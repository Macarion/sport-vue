"""Recorded-camera browser integration against the real backend.

Start Vite with VITE_API_BASE_URL pointing at the test backend, then supply a
MP4 recording as --video. The browser never opens a physical camera.
"""
import argparse
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright


def main(args):
    args.output.mkdir(parents=True, exist_ok=True)
    face_mode = 'face enabled, unregistered fixture' if args.expect_face else 'face disabled'
    report = {'mode': f'Chromium + recorded camera + real WebRTC/backend; {face_mode}', 'runs': []}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.browser, headless=True, args=[
            
            '--autoplay-policy=no-user-gesture-required',
        ])
        context = browser.new_context(permissions=['camera'], viewport={'width': 1440, 'height': 1000})
        context.route('**/jump-fixture.mp4', lambda route: route.fulfill(path=str(args.video.resolve()), content_type='video/mp4'))
        context.add_init_script("""localStorage.setItem('username', 'browser_jump');
            window.jumpMessages = []; window.cameraStreams = [];
            const Socket = window.WebSocket;
            window.WebSocket = class extends Socket {
              constructor(...args) { super(...args); this.addEventListener('message', e => {
                try { window.jumpMessages.push(JSON.parse(e.data)) } catch {} }); }
            };
            navigator.mediaDevices.getUserMedia = async () => {
              const video = document.createElement('video');
              video.muted = true; video.playsInline = true; video.preload = 'auto';
              video.src = '/jump-fixture.mp4';
              await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject });
              const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
              const draw = () => canvas.getContext('2d').drawImage(video, 0, 0, 1280, 720);
              draw(); const timer = setInterval(draw, 1000 / 15);
              const stream = canvas.captureStream(15);
              window.cameraStreams.push(stream); window.jumpFixture = video;
              window.fixtureTimer = timer;
              return stream;
            };
            speechSynthesis.speak = () => {};
        """)
        page = context.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            for run in range(2):
                page.goto(args.url, wait_until='networkidle')
                page.get_by_role('button', name='开启摄像头', exact=True).click()
                page.wait_for_function("window.jumpMessages.some(m => m.type === 'data' && m.data.state === 'ARMED')", timeout=120000)
                page.evaluate('window.jumpFixture.play()')
                page.wait_for_function("window.jumpMessages.some(m => m.type === 'data' && ['RESULT', 'FAILED'].includes(m.data.state))", timeout=90000)
                messages = page.evaluate('window.jumpMessages')
                result = next(m['data'] for m in reversed(messages) if m['type'] == 'data')
                page.screenshot(path=str(args.output / f'run{run + 1}.png'), full_page=True)
                assert result['state'] == 'RESULT', result.get('message')
                if args.expect_face:
                    assert result.get('face', {}).get('state') == 'passed'
                    assert result['face']['registered'] is False
                assert page.locator('.status-score strong').inner_text() != '-'
                assert page.evaluate("document.querySelector('video').srcObject !== null")
                page.get_by_role('button', name='关闭摄像头', exact=True).click()
                page.get_by_role('button', name='开启摄像头', exact=True).wait_for()
                page.wait_for_function("window.cameraStreams.every(s => s.getTracks().every(t => t.readyState === 'ended'))")
                page.wait_for_function("document.querySelector('video').srcObject === null")
                page.evaluate('clearInterval(window.fixtureTimer)')
                page.wait_for_timeout(500)
                report['runs'].append({'state': result['state'], 'score_cm': result['score_cm'],
                                       'session_id': result['session_id'], 'messages': len(messages),
                                       'camera_released': True, 'face': result.get('face')})
            assert report['runs'][0]['session_id'] != report['runs'][1]['session_id']
            assert not errors, errors
            report['passed'] = True
        except Exception as exc:
            report['passed'] = False; report['error'] = str(exc)
            report['messages'] = page.evaluate('window.jumpMessages || []')
            page.screenshot(path=str(args.output / 'failure.png'), full_page=True)
            raise
        finally:
            report['page_errors'] = errors
            (args.output / 'browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', required=True)
    parser.add_argument('--video', type=Path, required=True)
    parser.add_argument('--url', default='http://127.0.0.1:15173/tests/jump-browser.html')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--expect-face', action='store_true', help='Require real face-service unregistered admission')
    main(parser.parse_args())
