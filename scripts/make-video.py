"""Optional deliverable build: macOS say + Pillow + ffmpeg. Not needed by the API."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, textwrap

root = Path(__file__).resolve().parent.parent
work = root / 'artifacts/video-build'
work.mkdir(parents=True, exist_ok=True)
scenes = json.loads((root / 'deliverables/video-scenes.json').read_text())
fontpath = '/System/Library/Fonts/Supplemental/Arial.ttf'
boldpath = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font = lambda n, bold=False: ImageFont.truetype(boldpath if bold else fontpath, n)
segments = []
transcript = ['# GridWise solution video transcript', '', 'Synthetic narration. Review before submission. No secrets are shown.', '']
for i, s in enumerate(scenes):
    img = Image.new('RGB', (1280,720), '#0b1420'); d = ImageDraw.Draw(img)
    d.rectangle((0,0,1280,8), fill='#52dfac')
    d.text((70,48),'BUP CSE FEST 2026 / GRIDWISE',font=font(19,True),fill='#52dfac')
    d.text((70,125),s['title'],font=font(55,True),fill='#f3f7fc')
    d.text((70,209),s['subtitle'],font=font(25),fill='#9aacbd')
    y=300
    for line in s['lines']:
        d.rounded_rectangle((70,y,1210,y+62),radius=10,fill='#152535')
        d.rectangle((90,y+22,97,y+40),fill='#52dfac')
        d.text((120,y+15),line,font=font(24),fill='#e1eaf2')
        y+=76
    d.text((70,667),'NestJS  /  OpenAI  /  deterministic validation  /  linear programming',font=font(17),fill='#8195a9')
    d.text((1140,663),f'{i+1} / 6',font=font(22),fill='#52dfac')
    picture=work/f'{i}.png'; img.save(picture)
    speech=work/f'{i}.txt'; speech.write_text(s['narration'])
    audio=work/f'{i}.aiff'
    subprocess.run(['say','-v','Samantha','-r','172','-f',str(speech),'-o',str(audio)],check=True)
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(audio)]))+0.7
    segment=work/f'{i}.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','24','-i',str(picture),'-i',str(audio),'-t',str(duration),'-vf','format=yuv420p','-c:v','libx264','-preset','fast','-crf','23','-c:a','aac','-af','apad',str(segment)],check=True)
    segments.append(segment)
    transcript += [f'## {i+1}. {s["title"]}', '', s['narration'], '']
manifest=work/'concat.txt';manifest.write_text(''.join(f"file '{s}'\n" for s in segments))
output=root/'deliverables/gridwise-solution.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(output)],check=True)
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(output)]))
if duration>180: raise RuntimeError(f'Video exceeds three minutes: {duration}')
(root/'deliverables/video-transcript.md').write_text('\n'.join(transcript))
print(f'Created {output.name}: {duration:.2f} seconds; {output.stat().st_size} bytes')
