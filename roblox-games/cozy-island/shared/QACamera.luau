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
 status.Size=UDim2.fromOffset(138,28)
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

 local function captureOne(label)
  local done=false
  local assetId=nil
  local failure=nil
  local ok,err=pcall(function()
   CaptureService:TakeScreenshotCaptureAsync(function(result,capture)
    if result~=Enum.ScreenshotCaptureResult.Success or not capture then
     failure="capture:"..tostring(result)
     done=true
     return
    end
    local uploadOk,uploadResult,id=pcall(function()
     return CaptureService:UploadCaptureAsync(capture)
    end)
    if uploadOk and uploadResult==Enum.UploadCaptureResult.Success and id then
     assetId=tostring(id)
    else
     failure="upload:"..tostring(uploadOk and uploadResult or id)
    end
    done=true
   end,{UICaptureMode=Enum.UICaptureMode.All})
  end)
  if not ok then return nil,"api:"..tostring(err)end
  local deadline=os.clock()+18
  while not done and os.clock()<deadline do task.wait(.1)end
  if not done then return nil,"timeout"end
  if assetId then remote:FireServer(label,assetId);return assetId,nil end
  return nil,failure or"unknown"
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
  if #points==0 then
   status.Text="QA 지점 준비 안 됨";status.Visible=true
   task.delay(2,function()if not busy then status.Visible=false end end)
   return
  end
  busy=true;button.Text="권한확인";status.Visible=true
  task.spawn(function()
   local permissionOk,permissionGranted=pcall(function()
    return CaptureService:PromptCaptureGalleryPermissionAsync(Enum.CaptureGalleryPermission.ReadAndUpload)
   end)
   if not permissionOk or permissionGranted~=true then
    status.Text="캡처 권한 허용 필요"
    busy=false;button.Text="QA촬영"
    task.delay(3,function()if not busy then status.Visible=false end end)
    return
   end
   button.Text="촬영중"
   local camera=Workspace.CurrentCamera
   if not camera then busy=false;button.Text="QA촬영";return end
   local saved={cameraType=camera.CameraType,cframe=camera.CFrame,focus=camera.Focus,fov=camera.FieldOfView,subject=camera.CameraSubject}
   camera.CameraType=Enum.CameraType.Scriptable
   camera.FieldOfView=68
   for index,shot in ipairs(points)do
    status.Text=string.format("%d/%d · %s",index,#points,shot.label)
    camera.CFrame=CFrame.lookAt(shot.position,shot.lookAt)
    camera.Focus=CFrame.new(shot.lookAt)
    task.wait(.7)
    local id,err=captureOne(shot.label)
    if id then status.Text="저장 "..shot.label.." · "..id else status.Text="실패 "..shot.label.." · "..tostring(err)end
    task.wait(.35)
   end
   restoreCamera(camera,saved)
   busy=false;button.Text="QA촬영";status.Text="QA 촬영 완료"
   task.delay(3,function()if not busy then status.Visible=false end end)
  end)
 end)
end

return table.freeze(QACamera)
