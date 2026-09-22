local QACamera={}

function QACamera.install(config,screenGui,pointProvider)
 if config.QACameraEnabled~=true then return end
 local CaptureService=game:GetService("CaptureService")
 local ReplicatedStorage=game:GetService("ReplicatedStorage")
 local Workspace=game:GetService("Workspace")
 local remote=ReplicatedStorage:WaitForChild(config.QACaptureRemoteName or "QACaptureReport")
 local busy=false

 local function roundify(target,radius)
  local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,radius or 8);c.Parent=target
 end

 local button=Instance.new("TextButton")
 button.Name="InternalQACameraButton"
 button.AnchorPoint=Vector2.new(0,.5)
 button.Position=UDim2.new(0,6,.5,0)
 button.Size=UDim2.fromOffset(58,30)
 button.BackgroundColor3=Color3.fromRGB(35,38,46)
 button.BackgroundTransparency=.18
 button.Text="QA촬영"
 button.TextColor3=Color3.fromRGB(235,240,247)
 button.TextSize=11
 button.Font=Enum.Font.GothamBold
 button.ZIndex=40
 button.Parent=screenGui
 roundify(button,8)

 local status=Instance.new("TextLabel")
 status.Name="InternalQACameraStatus"
 status.AnchorPoint=Vector2.new(0,.5)
 status.Position=UDim2.new(0,68,.5,0)
 status.Size=UDim2.fromOffset(150,28)
 status.BackgroundColor3=Color3.fromRGB(20,22,28)
 status.BackgroundTransparency=.22
 status.TextColor3=Color3.fromRGB(226,233,242)
 status.TextSize=10
 status.Font=Enum.Font.Gotham
 status.Text="내부 QA 카메라"
 status.TextTruncate=Enum.TextTruncate.AtEnd
 status.Visible=false
 status.ZIndex=40
 status.Parent=screenGui
 roundify(status,7)

 local function takeOne(label)
  local done=false
  local captureObject=nil
  local failure=nil
  button.Visible=false
  status.Visible=false
  local ok,err=pcall(function()
   CaptureService:TakeScreenshotCaptureAsync(function(result,capture)
    if result==Enum.ScreenshotCaptureResult.Success and capture then
     captureObject=capture
    else
     failure="capture:"..tostring(result)
    end
    done=true
   end,{UICaptureMode=Enum.UICaptureMode.All})
  end)
  if not ok then
   button.Visible=true;status.Visible=true
   return nil,"api:"..tostring(err)
  end
  local deadline=os.clock()+12
  while not done and os.clock()<deadline do task.wait(.1)end
  button.Visible=true;status.Visible=true
  if not done then return nil,"capture-timeout"end
  if not captureObject then return nil,failure or"capture-failed"end
  return captureObject,nil
 end

 local function saveAndUpload(entries)
  local captures={}
  local labelByCapture={}
  for _,entry in ipairs(entries)do
   table.insert(captures,entry.capture)
   labelByCapture[entry.capture]=entry.label
  end
  if #captures==0 then return false,"no-captures"end

  local saveDone=false
  local saved={}
  local saveOk,saveErr=pcall(function()
   CaptureService:PromptSaveCapturesToGallery(captures,function(results)
    for capture,result in pairs(results or{})do
     if result==true then saved[capture]=true end
    end
    saveDone=true
   end)
  end)
  if not saveOk then return false,"save-prompt:"..tostring(saveErr)end

  local saveDeadline=os.clock()+45
  while not saveDone and os.clock()<saveDeadline do task.wait(.1)end
  if not saveDone then return false,"save-timeout"end

  local savedCount=0
  for capture in pairs(saved)do if labelByCapture[capture]then savedCount+=1 end end
  if savedCount==0 then return false,"save-denied"end

  task.spawn(function()
   local uploaded=0
   for capture,label in pairs(labelByCapture)do
    if saved[capture]then
     local uploadOk,uploadResult,id=pcall(function()
      return CaptureService:UploadCaptureAsync(capture)
     end)
     if uploadOk and uploadResult==Enum.UploadCaptureResult.Success and tonumber(id)and tonumber(id)>0 then
      remote:FireServer(label,tostring(math.floor(tonumber(id))))
      uploaded+=1
      status.Text=string.format("업로드 %d/%d",uploaded,savedCount)
      status.Visible=true
     else
      warn("QA capture upload failed:",label,uploadOk and tostring(uploadResult)or tostring(id))
     end
    end
   end
   if uploaded==savedCount then status.Text="QA 업로드 완료"else status.Text=string.format("QA 업로드 %d/%d",uploaded,savedCount)end
   status.Visible=true
   task.delay(5,function()if not busy then status.Visible=false end end)
  end)

  return true,nil
 end

 local function restoreCamera(camera,saved)
  if not camera then return end
  camera.CameraType=saved.cameraType
  camera.FieldOfView=saved.fov
  if saved.subject and saved.subject.Parent then camera.CameraSubject=saved.subject end
  camera.CFrame=saved.cframe
  camera.Focus=saved.focus
 end

 button.Activated:Connect(function()
  if busy then return end
  local points=pointProvider and pointProvider()or{}
  busy=true;button.Text="준비중";status.Text="QA 준비";status.Visible=true

  task.spawn(function()
   if #points==0 then
    local deadline=os.clock()+18
    status.Text="맵 준비 기다리는 중"
    while #points==0 and os.clock()<deadline do
     task.wait(.25)
     points=pointProvider and pointProvider()or{}
    end
    if #points==0 then
     status.Text="맵 시작 후 다시 눌러"
     busy=false;button.Text="QA촬영"
     task.delay(4,function()if not busy then status.Visible=false end end)
     return
    end
   end

   local permissionOk,permissionGranted=pcall(function()
    return CaptureService:PromptCaptureGalleryPermissionAsync(Enum.CaptureGalleryPermission.ReadAndUpload)
   end)
   if not permissionOk then
    status.Text="Roblox 메뉴 > 캡처 켜기"
    warn("QA capture gallery permission request failed:",permissionGranted)
    busy=false;button.Text="QA촬영"
    task.delay(5,function()if not busy then status.Visible=false end end)
    return
   end
   if permissionGranted~=true then
    status.Text="캡처 접근 허용 후 다시 눌러"
    busy=false;button.Text="QA촬영"
    task.delay(5,function()if not busy then status.Visible=false end end)
    return
   end

   button.Text="촬영중"
   local camera=Workspace.CurrentCamera
   if not camera then busy=false;button.Text="QA촬영";return end
   local savedCamera={cameraType=camera.CameraType,cframe=camera.CFrame,focus=camera.Focus,fov=camera.FieldOfView,subject=camera.CameraSubject}
   camera.CameraType=Enum.CameraType.Scriptable
   camera.FieldOfView=68

   local entries={}
   for index,shot in ipairs(points)do
    status.Text=string.format("%d/%d · %s",index,#points,shot.label)
    camera.CFrame=CFrame.lookAt(shot.position,shot.lookAt)
    camera.Focus=CFrame.new(shot.lookAt)
    task.wait(.75)
    local capture,err=takeOne(shot.label)
    if capture then
     table.insert(entries,{label=shot.label,capture=capture})
    else
     warn("QA capture failed:",shot.label,err)
    end
    task.wait(.2)
   end

   restoreCamera(camera,savedCamera)
   status.Text="갤러리 저장 확인"
   status.Visible=true
   local saveOk,saveErr=saveAndUpload(entries)
   busy=false;button.Text="QA촬영"
   if saveOk then
    status.Text="저장 완료 · 업로드 중"
   else
    status.Text="저장 실패 · "..tostring(saveErr)
    task.delay(5,function()if not busy then status.Visible=false end end)
   end
  end)
 end)
end

return table.freeze(QACamera)
