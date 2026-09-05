// 파일명: web-games/vibe-maker/workbench.js
// 역할: 브라우저 바이브 개발 작업실의 실제 프로젝트 분석/수정/백업/비교 실행기
// 규칙: 기존 파일을 먼저 읽고, 저장 전 스냅샷 생성, 모바일 우선

import { createVibeBuildPlan } from '../../assets/vibe-build-plan.js';
import { createVibeWorkspace } from '../../assets/vibe-workspace.js';
const STORAGE_KEY='jaewoon-vibe-workbench';
const clean=v=>String(v??'').trim();
const loadState=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return{}}};
const saveState=s=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
const textList=v=>Array.isArray(v)?v.filter(Boolean).map(clean):[];

export class VibeWorkbenchController{
 constructor({root=document}={}){this.root=root;this.workspace=null;this.plan=null;this.selectedPath=null;this.selectedText='';this.state=loadState()}
 bind(){[['openWorkspace',()=>this.openWorkspace()],['inspectProject',()=>this.inspectProject()],['planChange',()=>this.planChange()],['saveFile',()=>this.saveSelectedFile()],['restoreSnapshot',()=>this.restoreSelectedFile()],['refreshFiles',()=>this.refreshFiles()],['exportPlan',()=>this.exportPlan()]].forEach(([id,fn])=>this.bindButton(id,fn));this.restoreUi();return this}
 bindButton(id,handler){const node=this.root.getElementById(id);if(node)node.addEventListener('click',async()=>{try{await handler()}catch(e){this.setStatus(`오류: ${e.message}`)}})}
 async openWorkspace(){this.workspace=await window.pickJaewoonVibeWorkspace();const s=this.workspace.summary();this.state.workspaceOpened=true;saveState(this.state);this.renderSummary(s);this.renderFiles(s.files);this.setStatus(`프로젝트 열림 · 파일 ${s.fileCount}개`)}
 async refreshFiles(){if(!this.workspace)throw new Error('먼저 프로젝트 폴더를 열어줘');const s=await this.workspace.scan();this.renderSummary(s);this.renderFiles(s.files);this.setStatus(`새로 읽음 · ${s.fileCount}개 파일`)}
 async inspectProject(){if(!this.workspace)throw new Error('먼저 프로젝트 폴더를 열어줘');const s=this.workspace.summary();const target=s.godotProject?'godot':'web';const request=clean(this.root.getElementById('request')?.value)||'이 프로젝트 상태를 분석하고 품질 개선 방향을 알려줘';this.plan=createVibeBuildPlan({request,target});this.renderPlan(this.plan);this.setStatus(`분석 완료 · ${target==='godot'?'Godot':'웹'} 프로젝트`)}
 async planChange(){if(!this.workspace)throw new Error('먼저 프로젝트 폴더를 열어줘');const request=clean(this.root.getElementById('request')?.value);if(!request)throw new Error('뭘 고칠지 적어줘');const s=this.workspace.summary();const target=s.godotProject?'godot':'web';this.plan=createVibeBuildPlan({request,target,rebuild:/고퀄|퀄리티|리빌드|리메이크|업그레이드|제대로/i.test(request)});this.state.lastRequest=request;saveState(this.state);this.renderPlan(this.plan);this.setStatus('수정 계획 완료 · 책임 파일을 읽고 직접 수정할 준비가 됐어')}
 async selectFile(path){if(!this.workspace)throw new Error('프로젝트를 먼저 열어줘');const text=await this.workspace.read(path);this.selectedPath=path;this.selectedText=text;const ed=this.root.getElementById('editor');if(ed)ed.value=text;const name=this.root.getElementById('selectedFile');if(name)name.textContent=path;this.setStatus(`읽음 · ${path}`)}
 async saveSelectedFile(){if(!this.workspace||!this.selectedPath)throw new Error('수정할 파일을 먼저 골라줘');const ed=this.root.getElementById('editor');const next=ed?.value??'';const r=await this.workspace.write(this.selectedPath,next,{backup:true,expectedPrevious:this.selectedText});this.selectedText=next;this.setStatus(r.changed?`저장 완료 · 자동 백업 생성 · ${this.selectedPath}`:'변경 없음');await this.refreshFiles()}
 async restoreSelectedFile(){if(!this.workspace||!this.selectedPath)throw new Error('파일을 먼저 골라줘');const snap=this.workspace.snapshots.get(this.selectedPath);if(snap==null)throw new Error('이 세션에서 읽은 원본 스냅샷이 없어');const ed=this.root.getElementById('editor');if(ed)ed.value=snap;this.setStatus('원본 스냅샷 복원 준비 · 저장을 누르면 적용돼')}
 exportPlan(){if(!this.plan)throw new Error('먼저 작업 분석을 해줘');const blob=new Blob([JSON.stringify(this.plan,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vibe-plan.json';a.click();URL.revokeObjectURL(url);this.setStatus('작업 계획 저장 완료')}
 restoreUi(){const r=this.root.getElementById('request');if(r&&this.state.lastRequest)r.value=this.state.lastRequest}
 renderSummary(s){const n=this.root.getElementById('summary');if(!n)return;n.textContent=[`파일 ${s.fileCount}개`,`텍스트 ${s.textFiles}개`,`용량 ${Math.round(s.totalBytes/1024)}KB`,s.webProject?'웹 프로젝트':'',s.godotProject?'Godot 프로젝트':''].filter(Boolean).join(' · ')}
 renderFiles(files){const list=this.root.getElementById('files');if(!list)return;list.replaceChildren();for(const f of files.filter(x=>x.text).slice(0,500)){const b=document.createElement('button');b.type='button';b.className='fileItem';b.textContent=`${f.path} · ${Math.round(f.size/1024)}KB`;b.addEventListener('click',()=>this.selectFile(f.path).catch(e=>this.setStatus(`오류: ${e.message}`)));list.appendChild(b)}}
 renderPlan(p){const q=textList(p.qualitySystems);const fields={intent:p.intent?.join(', ')||'분석',target:p.target,affected:textList(p.affectedSystems).join(', ')||'일반',protected:textList(p.protectedTargets).join(', ')||'없음',style:p.visualStyle?.style||'기존 스타일 유지',animation:p.animation?.states?.join(', ')||'기본 모션',mobile:p.mobile?.virtualJoystick?'터치 + 조이스틱':'확인 필요',quality:q.join(' · ')||'기본 품질 검사'};for(const[k,v]of Object.entries(fields)){const n=this.root.getElementById(`plan-${k}`);if(n)n.textContent=v}const steps=this.root.getElementById('steps');if(steps)steps.textContent=(p.phases||[]).join('\n');const qualityNode=this.root.getElementById('qualitySystems');if(qualityNode)qualityNode.replaceChildren(...q.map(x=>{const s=document.createElement('span');s.className='chip';s.textContent=x;return s}))}
 setStatus(message){const n=this.root.getElementById('status');if(n)n.textContent=clean(message)}
}
export function createVibeWorkbenchController(options={}){return new VibeWorkbenchController(options).bind()}
if(typeof window!=='undefined')window.createJaewoonVibeWorkbenchController=createVibeWorkbenchController;
