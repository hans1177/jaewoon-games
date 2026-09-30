-- Standalone asset-review place only. Never injected into an existing game.
local Players=game:GetService("Players")
local Input=game:GetService("UserInputService")
local RunService=game:GetService("RunService")
local Assets=game:GetService("ReplicatedStorage"):WaitForChild("WorldGhostSkins")
local Factory=require(Assets:WaitForChild("GhostSkinFactory"))
local Motion=require(Assets:WaitForChild("GhostSkinMotion"))
local Audit=require(Assets:WaitForChild("GhostSkinAudit"))
local player=Players.LocalPlayer
local gui=Instance.new("ScreenGui")
gui.Name="WorldGhostGallery";gui.ResetOnSpawn=false;gui.Parent=player:WaitForChild("PlayerGui")
local bar=Instance.new("ScrollingFrame");bar.Name="GalleryControls";bar.Size=UDim2.new(1,-24,0,236);bar.Position=UDim2.fromOffset(12,12)
bar.CanvasSize=UDim2.fromOffset(0,236);bar.ScrollBarThickness=4;bar.ScrollingDirection=Enum.ScrollingDirection.Y
bar.BackgroundColor3=Color3.fromRGB(22,26,34);bar.Parent=gui
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-16,0,54);title.Position=UDim2.fromOffset(8,4)
title.BackgroundTransparency=1;title.TextColor3=Color3.fromRGB(240,240,240);title.TextSize=16;title.TextWrapped=true;title.Parent=bar
local function button(name,text,x,y)
 local value=Instance.new("TextButton");value.Name=name;value.Text=text;value.Size=UDim2.new(1/3,-10,0,52)
 value.Position=UDim2.new(x,5,0,y);value.BackgroundColor3=Color3.fromRGB(47,58,72)
 value.TextColor3=Color3.fromRGB(255,255,255);value.TextSize=14;value.TextWrapped=true;value.Parent=bar;return value
end
local previous=button("PreviousPage","◀ 이전",0,60)
local qualityButton=button("Quality","품질: mid",1/3,60)
local nextPage=button("NextPage","다음 ▶",2/3,60)
local motionButton=button("Motion","동작: idle",0,118)
local focusButton=button("Focus","개별 보기",1/3,118)
local angleButton=button("Angle","시점 회전",2/3,118)
local auditButton=button("NativeAudit","100종 구조 검사",0,176)
local pauseButton=button("PauseMotion","동작 멈춤",1/3,176)
local info=Instance.new("TextLabel");info.Size=UDim2.new(1/3,-10,0,52);info.Position=UDim2.new(2/3,5,0,176)
info.BackgroundTransparency=1;info.TextColor3=Color3.fromRGB(182,195,210);info.TextSize=12;info.TextWrapped=true
info.Text="구조 검사 ≠ 아트/게임 완성";info.Parent=bar
local page=1;local qualityIndex=2;local qualities={"far","mid","near"};local gallery=nil
local bindings={};local motionIndex=1;local elapsed=0;local focus=0;local angle=0;local auditing=false;local paused=false
local function clear()
 for _,binding in ipairs(bindings)do binding.destroy()end;table.clear(bindings)
 if gallery then gallery:Destroy();gallery=nil end
end
local function cameraView()
 local camera=workspace.CurrentCamera;if not camera or not gallery then return end
 bar.Size=UDim2.new(1,-24,0,math.clamp(camera.ViewportSize.Y*.3,106,236))
 local models=gallery:GetChildren();local target=Vector3.new(22,4,8);local distance=54
 if focus>0 and models[focus]then
  local model=models[focus];local cf,size=model:GetBoundingBox();target=cf.Position;distance=math.max(size.Y,size.X,size.Z)*2.3+3
  info.Text=model:GetAttribute("DisplayName").."\n"..model:GetAttribute("AssetId")
 else info.Text="구조 검사 ≠ 아트/게임 완성"end
 local radians=math.rad(angle)
 camera.CameraType=Enum.CameraType.Scriptable
 camera.CFrame=CFrame.lookAt(target+Vector3.new(math.sin(radians)*distance,distance*.3,-math.cos(radians)*distance),target)
 camera.FieldOfView=58
end
local function draw()
 if auditing then return end
 clear()
 gallery=Factory.CreateGallery(workspace,page,qualities[qualityIndex])
 for _,model in ipairs(gallery:GetChildren())do
  table.insert(bindings,Motion.Bind(model))
  local label=Instance.new("BillboardGui");label.Name="SkinName";label.Size=UDim2.fromOffset(150,48)
  label.StudsOffsetWorldSpace=Vector3.new(0,11,0);label.AlwaysOnTop=true;label.Adornee=model.PrimaryPart;label.Parent=model
  local text=Instance.new("TextLabel");text.Size=UDim2.fromScale(1,1);text.BackgroundColor3=Color3.fromRGB(20,23,29)
  text.BackgroundTransparency=.15;text.TextColor3=Color3.fromRGB(235,235,235);text.TextSize=14;text.TextWrapped=true
  text.Text=model:GetAttribute("DisplayName").."\n"..model:GetAttribute("AssetId");text.Parent=label
 end
 focus=math.min(focus,#gallery:GetChildren())
 title.Text=string.format("세계 귀신 100종 · %d / 13쪽\n내부 원형 자산 · 최종 아트/게임 검증 대기",page)
 qualityButton.Text="품질: "..qualities[qualityIndex]
 cameraView()
end
previous.Activated:Connect(function()if not auditing then page=(page-2)%13+1;draw()end end)
nextPage.Activated:Connect(function()if not auditing then page=page%13+1;draw()end end)
qualityButton.Activated:Connect(function()qualityIndex=qualityIndex%3+1;draw()end)
motionButton.Activated:Connect(function()motionIndex=motionIndex%#Motion.States+1;elapsed=0;motionButton.Text="동작: "..Motion.States[motionIndex]end)
focusButton.Activated:Connect(function()if gallery then focus=(focus+1)%(#gallery:GetChildren()+1);cameraView()end end)
angleButton.Activated:Connect(function()angle=(angle+45)%360;cameraView()end)
pauseButton.Activated:Connect(function()paused=not paused;pauseButton.Text=paused and "동작 재생" or "동작 멈춤"end)
auditButton.Activated:Connect(function()
 if auditing then return end
 auditing=true;clear();auditButton.Text="검사 중"
 task.spawn(function()
  local report=Audit.Run(workspace,function(index,total,id,ok)if gui.Parent then title.Text=string.format("구조 검사 %d / %d\n%s · %s",index,total,id,ok and "구조 통과" or "실패")end end,function()return gui.Parent==nil end)
  print("WORLD_GHOST_NATIVE_AUDIT="..game:GetService("HttpService"):JSONEncode(report))
  if gui.Parent then
   gui:SetAttribute("NativeStructurePassed",report.structurePassed)
   gui:SetAttribute("NativeTestedCount",report.tested);gui:SetAttribute("NativeFailureCount",report.failed)
  end
  auditing=false
  if gui.Parent then auditButton.Text=string.format("구조 %d/100 · 실패 %d",report.tested,report.failed);draw()end
 end)
end)
local updateBudget=0
local motionConnection=RunService.PreSimulation:Connect(function(delta)
 if paused or auditing then return end
 elapsed+=delta;updateBudget+=delta
 if updateBudget<1/30 then return end;updateBudget=0
 local state=Motion.States[motionIndex];local t=elapsed
 if state=="attack" then t=elapsed%1.8 elseif state=="hit"then t=elapsed%1 elseif state=="death"then t=math.min(elapsed,1.2)end
 for _,binding in ipairs(bindings)do binding.step(t,state)end
end)
local connection=Input.InputBegan:Connect(function(input,processed)
 if processed or Input:GetFocusedTextBox()or auditing then return end
 if input.KeyCode==Enum.KeyCode.Right then page=page%13+1;draw()
 elseif input.KeyCode==Enum.KeyCode.Left then page=(page-2)%13+1;draw()end
end)
gui.Destroying:Connect(function()connection:Disconnect();motionConnection:Disconnect();clear()end)
draw()
