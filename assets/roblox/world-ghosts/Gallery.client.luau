-- Standalone asset-review place only. Never injected into an existing game.
local Players=game:GetService("Players")
local Input=game:GetService("UserInputService")
local Factory=require(game:GetService("ReplicatedStorage"):WaitForChild("WorldGhostSkins"):WaitForChild("GhostSkinFactory"))
local player=Players.LocalPlayer
local gui=Instance.new("ScreenGui")
gui.Name="WorldGhostGallery";gui.ResetOnSpawn=false;gui.Parent=player:WaitForChild("PlayerGui")
local bar=Instance.new("Frame");bar.Name="GalleryControls";bar.Size=UDim2.new(1,-24,0,118);bar.Position=UDim2.fromOffset(12,12)
bar.BackgroundColor3=Color3.fromRGB(22,26,34);bar.Parent=gui
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-16,0,54);title.Position=UDim2.fromOffset(8,4)
title.BackgroundTransparency=1;title.TextColor3=Color3.fromRGB(240,240,240);title.TextSize=16;title.TextWrapped=true;title.Parent=bar
local function button(name,text,x)
 local value=Instance.new("TextButton");value.Name=name;value.Text=text;value.Size=UDim2.new(1/3,-10,0,52)
 value.Position=UDim2.new(x,5,0,60);value.BackgroundColor3=Color3.fromRGB(47,58,72)
 value.TextColor3=Color3.fromRGB(255,255,255);value.TextSize=16;value.Parent=bar;return value
end
local previous=button("PreviousPage","◀ 이전",0)
local qualityButton=button("Quality","품질: mid",1/3)
local nextPage=button("NextPage","다음 ▶",2/3)
local page=1;local qualityIndex=2;local qualities={"far","mid","near"};local gallery=nil
local function draw()
 -- Release the previous eight before allocating the next page.
 if gallery then gallery:Destroy()end
 gallery=Factory.CreateGallery(workspace,page,qualities[qualityIndex])
 for _,model in ipairs(gallery:GetChildren())do
  local label=Instance.new("BillboardGui");label.Name="SkinName";label.Size=UDim2.fromOffset(150,48)
  label.StudsOffsetWorldSpace=Vector3.new(0,11,0);label.AlwaysOnTop=true;label.Adornee=model.PrimaryPart;label.Parent=model
  local text=Instance.new("TextLabel");text.Size=UDim2.fromScale(1,1);text.BackgroundColor3=Color3.fromRGB(20,23,29)
  text.BackgroundTransparency=.15;text.TextColor3=Color3.fromRGB(235,235,235);text.TextSize=14;text.TextWrapped=true
  text.Text=model:GetAttribute("DisplayName").."\n"..model:GetAttribute("AssetId");text.Parent=label
 end
 title.Text=string.format("세계 귀신 100종 · %d / 13쪽\n내부 원형 자산 · 아트/Studio 검증 대기",page)
 qualityButton.Text="품질: "..qualities[qualityIndex]
 local camera=workspace.CurrentCamera
 if camera then camera.CameraType=Enum.CameraType.Scriptable;camera.CFrame=CFrame.lookAt(Vector3.new(22,24,-42),Vector3.new(22,4,8));camera.FieldOfView=58 end
end
previous.Activated:Connect(function()page=(page-2)%13+1;draw()end)
nextPage.Activated:Connect(function()page=page%13+1;draw()end)
qualityButton.Activated:Connect(function()qualityIndex=qualityIndex%3+1;draw()end)
local connection=Input.InputBegan:Connect(function(input,processed)
 if processed or Input:GetFocusedTextBox()then return end
 if input.KeyCode==Enum.KeyCode.Right then page=page%13+1;draw()
 elseif input.KeyCode==Enum.KeyCode.Left then page=(page-2)%13+1;draw()end
end)
gui.Destroying:Connect(function()connection:Disconnect();if gallery then gallery:Destroy()end end)
draw()
