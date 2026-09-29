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
 status.Size=UDim2.fromOffset(178,28)
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

 local function report(label,value)
  remote:FireServer(label,tostring(value or""))
 end

 local function takeOne()
  local done=false
  local captureObject=nil
  local failure=nil
  button.Visible=false
  status.Visible=false
  local ok,err=pcall(function()
   CaptureService:TakeScreenshotCaptureAsync(function(result,capture)
    if result==Enum.ScreenshotCaptureResult.Success and capture then captureObject=capture else failure=tostring(result)end
    done=true
   end,{UICaptureMode=Enum.UICaptureMode.All})
  end)
  if not ok then button.Visible=true;status.Visible=true;return nil,"api:"..tostring(err)end
  local deadline=os.clock()+12
  while not done and os.clock()<deadline do task.wait(.1)end
  button.Visible=true;status.Visible=true
  if not done then return nil,"capture-timeout"end
  return captureObject,failure
 end

 local function uploadSavedCapture(capture)
  local startResult,token=CaptureService:StartUploadCaptureAsync(capture)
  if startResult~=Enum.UploadCaptureResult.UploadPending and startResult~=Enum.UploadCaptureResult.Success then
   return startResult,0
  end
  local deadline=os.clock()+150
  while os.clock()<deadline do
   task.wait(.6)
   local statusResult,assetId=CaptureService:CheckUploadCaptureStatusAsync(token)
   if statusResult~=Enum.UploadCaptureResult.UploadPending then return statusResult,assetId end
  end
  return Enum.UploadCaptureResult.UploadFailed,0
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
    local deadline=os.clock()+25
    status.Text="맵 준비 기다리는 중"
    while #points==0 and os.clock()<deadline do
     task.wait(.25)
     points=pointProvider and pointProvider()or{}
    end
    if #points==0 then
     status.Text="맵 생성 실패"
     report("STATUS","MAP_NOT_READY")
     busy=false;button.Text="QA촬영"
     task.delay(5,function()if not busy then status.Visible=false end end)
     return
    end
   end

   local camera=Workspace.CurrentCamera
   if not camera then report("STATUS","NO_CAMERA");busy=false;button.Text="QA촬영";return end
   local savedCamera={cameraType=camera.CameraType,cframe=camera.CFrame,focus=camera.Focus,fov=camera.FieldOfView,subject=camera.CameraSubject}
   camera.CameraType=Enum.CameraType.Scriptable
   camera.FieldOfView=68

   local entries={}
   for index,shot in ipairs(points)do
    status.Text=string.format("%d/%d · %s",index,#points,shot.label)
    camera.CFrame=CFrame.lookAt(shot.position,shot.lookAt)
    camera.Focus=CFrame.new(shot.lookAt)
    task.wait(.75)
    local capture,err=takeOne()
    if capture then
     table.insert(entries,{label=shot.label,capture=capture})
    else
     report("STATUS","CAPTURE_FAIL:"..tostring(err or shot.label))
    end
    task.wait(.15)
   end
   restoreCamera(camera,savedCamera)

   if #entries==0 then
    status.Text="촬영 실패";report("STATUS","NO_CAPTURES")
    busy=false;button.Text="QA촬영";return
   end

   local rawCaptures={}
   for _,entry in ipairs(entries)do table.insert(rawCaptures,entry.capture)end
   local saveDone=false
   local saved={}
   status.Text="갤러리 저장 허용"
   local saveOk,saveErr=pcall(function()
    CaptureService:PromptSaveCapturesToGallery(rawCaptures,function(results)
     for capture,accepted in pairs(results or{})do
      if accepted==true then saved[capture]=true end
     end
     saveDone=true
    end)
   end)
   if not saveOk then
    status.Text="갤러리 저장 실패";report("STATUS","SAVE_PROMPT_FAIL:"..tostring(saveErr))
    busy=false;button.Text="QA촬영";return
   end

   local saveDeadline=os.clock()+45
   while not saveDone and os.clock()<saveDeadline do task.wait(.1)end
   if not saveDone then
    status.Text="갤러리 저장 시간초과";report("STATUS","SAVE_TIMEOUT")
    busy=false;button.Text="QA촬영";return
   end

   local savedCount=0
   for _,entry in ipairs(entries)do if saved[entry.capture]then savedCount+=1 end end
   if savedCount==0 then
    status.Text="갤러리 저장 취소";report("STATUS","SAVE_DENIED")
    busy=false;button.Text="QA촬영";return
   end

   status.Text="갤러리 접근 허용"
   local permissionOk,permissionGranted=pcall(function()
    return CaptureService:PromptCaptureGalleryPermissionAsync(Enum.CaptureGalleryPermission.ReadAndUpload)
   end)
   if not permissionOk or permissionGranted~=true then
    status.Text="갤러리 접근 허용 필요"
    report("STATUS",permissionOk and"PERMISSION_DENIED_AFTER_SAVE"or("PERMISSION_PROMPT_FAIL:"..tostring(permissionGranted)))
    busy=false;button.Text="QA촬영"
    task.delay(6,function()if not busy then status.Visible=false end end)
    return
   end

   local uploaded=0
   local uploadTotal=0
   for _,entry in ipairs(entries)do
    if saved[entry.capture]then
     uploadTotal+=1
     status.Text=string.format("업로드 %d/%d",uploadTotal,savedCount)
     local uploadResult,assetId
     local uploadOk,uploadErr=pcall(function()
      uploadResult,assetId=uploadSavedCapture(entry.capture)
     end)
     if uploadOk and uploadResult==Enum.UploadCaptureResult.Success and tonumber(assetId)and tonumber(assetId)>0 then
      report(entry.label,tostring(math.floor(tonumber(assetId))))
      uploaded+=1
     else
      report("STATUS","UPLOAD_FAIL:"..entry.label..":"..tostring(uploadOk and uploadResult or uploadErr))
     end
    end
   end

   report("STATUS","UPLOAD_COMPLETE:"..uploaded.."/"..savedCount)
   status.Text=uploaded==savedCount and"QA 업로드 완료"or string.format("QA 업로드 %d/%d",uploaded,savedCount)
   busy=false;button.Text="QA촬영"
   task.delay(6,function()if not busy then status.Visible=false end end)
  end)
 end)
end

return table.freeze(QACamera)
