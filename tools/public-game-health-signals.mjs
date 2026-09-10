const count=value=>Math.max(0,Number(value)||0);

export function summarizeFrameSignals(rows=[]){
  return rows.reduce((total,row)=>({
    text:total.text+count(row?.text),
    canvas:total.canvas+count(row?.canvas),
    interactive:total.interactive+count(row?.interactive),
    visual:total.visual+count(row?.visual),
  }),{text:0,canvas:0,interactive:0,visual:0});
}

export function assessPlayableDocument({hasDoctype=false,htmlElement=false,canvas=0,interactive=0}={}){
  const documentShapeOk=Boolean(hasDoctype&&htmlElement);
  const playableSurfaceSignal=count(canvas)>0||count(interactive)>0;
  return {
    documentShapeOk,
    playableSurfaceSignal,
    contentSignal:documentShapeOk&&playableSurfaceSignal,
  };
}
