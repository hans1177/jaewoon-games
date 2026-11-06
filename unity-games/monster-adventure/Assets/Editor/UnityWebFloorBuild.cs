// 파일명: unity-games/monster-adventure/Assets/Editor/UnityWebFloorBuild.cs
// 기존 3D 자산 제작·WebGL/Android 빌드를 유지하면서 재질 렌더링만 개선한다.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Collections.Generic;
using System.Globalization;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

public static class UnityWebFloorBuild
{
    private const string SceneFolder = "Assets/Scenes";
    private const string ScenePath = "Assets/Scenes/Main.unity";
    private const string SurfaceShaderPath = "Assets/Materials/LibrarySurface.shader";
    private const string DetailTexturePath = "Assets/Materials/library-surface-detail-v1.asset";

    public static void BuildWeb()
    {
        EnsureScene();
        if(!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL,BuildTarget.WebGL))
            throw new Exception("WEBGL_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName="Jaewoon Games";
        PlayerSettings.productName="몬스터 어드벤처 Web";
        string root=Directory.GetParent(Application.dataPath).FullName;
        string output=Path.GetFullPath(Path.Combine(root,"..","..","build","WebGL","monster-adventure"));
        Directory.CreateDirectory(output);
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.WebGL,options=BuildOptions.None
        });
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("WEBGL_BUILD_FAILED:"+report.summary.result);
        if(!File.Exists(Path.Combine(output,"index.html")))throw new Exception("WEBGL_OUTPUT_MISSING");
    }

    public static void Build()
    {
        EnsureScene();
        if(!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android,BuildTarget.Android))
            throw new Exception("ANDROID_TARGET_SWITCH_FAILED");
        PlayerSettings.companyName="Jaewoon Games";
        PlayerSettings.productName="몬스터 어드벤처";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android,"com.jaewoongames.monsteradventure");
        PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android,false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android,new[]{GraphicsDeviceType.OpenGLES3});
        string root=Directory.GetParent(Application.dataPath).FullName;
        string dir=Path.GetFullPath(Path.Combine(root,"..","..","build","Android"));
        Directory.CreateDirectory(dir);
        string output=Path.Combine(dir,"monster-adventure.apk");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
            scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.Android,options=BuildOptions.Development
        });
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("ANDROID_BUILD_FAILED:"+report.summary.result);
    }

    private static void EnsureScene()
    {
        if(!AssetDatabase.IsValidFolder(SceneFolder))AssetDatabase.CreateFolder("Assets","Scenes");
        Scene scene=AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath)==null
            ?EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single)
            :EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
        var root=GameObject.Find("UNITY_WEB_FLOOR_ROOT")??new GameObject("UNITY_WEB_FLOOR_ROOT");
        if(root.GetComponent<UnityWebFloorGame>()==null)root.AddComponent<UnityWebFloorGame>();
        BindLibraryAssets(scene);
        EditorSceneManager.MarkSceneDirty(scene);
        if(!EditorSceneManager.SaveScene(scene,ScenePath))throw new Exception("SCENE_SAVE_FAILED");
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }
    // 메인: 기존 사내 라이브러리 OBJ/MTL을 WebGL/Android 공통 Unity Mesh와 재질로 편집기에서 실체화한다.
    // Unity 런타임에서 외부 3D 파일을 내려받거나 새 게임플레이·저장 규칙을 생성하지 않는다.
    private static void BindLibraryAssets(Scene scene)
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        EnsureDetailTexture();
        // 모델은 동일한 라이브러리 원본을 참조하고, 역할·배치·색상은 게임 정체성에 맞게 지정한다.
        BindModel(scene,"Environment_ACTION","foundation_rect","survival-core-world",new Vector3(0f,-2.10f,0f),1.7f,0f);
        BindModel(scene,"Trail_ACTION","road_dirt","survival-core-world",new Vector3(0f,-0.65f,0f),1.3f,0f);
        BindModel(scene,"Character_monster-adventure","flamefox","monster-adventure",new Vector3(-2f,0f,0f),0.58f,180f);
        BindModel(scene,"Enemy_ACTION","boar","monster-adventure",new Vector3(2f,0f,1f),0.62f,190f);
        BindModel(scene,"Equipment_ACTION","chest","survival-core-world",new Vector3(0f,0f,-1.5f),0.43f,16f);
        BindModel(scene,"Identity_ACTION","hornbull","monster-adventure",new Vector3(0f,0f,3.4f),0.63f,180f);
        BindModel(scene,"Starter_LeafTurtle","leafturtle","monster-adventure",new Vector3(-4.1f,0f,0.9f),0.53f,125f);
        BindModel(scene,"Starter_WaterOtter","waterotter","monster-adventure",new Vector3(3.8f,0f,-0.7f),0.50f,210f);
        BindModel(scene,"Wild_Bat","bat","monster-adventure",new Vector3(-4.2f,1.2f,4.0f),0.48f,130f);
        BindModel(scene,"Wild_Bird","bird","monster-adventure",new Vector3(4.2f,2.0f,4.8f),0.45f,205f);
        BindModel(scene,"Elite_RockGator","rockgator","monster-adventure",new Vector3(3.9f,0f,6.4f),0.45f,190f);
        BindModel(scene,"Elite_StormEagle","stormeagle","monster-adventure",new Vector3(-2.8f,2.2f,6.1f),0.48f,200f);
        BindModel(scene,"Tree_Left_Trunk","tree_trunk_thick","survival-core-world",new Vector3(-5.6f,0f,3.4f),0.51f,0f);
        BindModel(scene,"Tree_Left_Crown","tree_crown_round","survival-core-world",new Vector3(-5.6f,2.3f,3.4f),0.77f,0f);
        BindModel(scene,"Tree_Right_Trunk","tree_trunk_thick","survival-core-world",new Vector3(5.7f,0f,2.7f),0.49f,0f);
        BindModel(scene,"Tree_Right_Crown","tree_crown_round","survival-core-world",new Vector3(5.7f,2.3f,2.7f),0.74f,0f);
        BindModel(scene,"World_Rock","rock_medium","survival-core-world",new Vector3(-3.8f,0f,3.4f),0.81f,0f);
        BindModel(scene,"World_Lamp","lamp","survival-core-world",new Vector3(2.8f,0f,-1.2f),0.67f,0f);
    }

    // 그래픽: 외부 OBJ를 실행 중 파싱하지 않고 게임의 기존 빌드 편집기에서 실제 Unity Mesh 에셋으로 제작한다.
    private static void BindModel(Scene scene,string sceneName,string assetId,string paletteId,Vector3 position,float scale,float yaw)
    {
        string objPath=Path.Combine(Application.dataPath,"Art",assetId+".obj");
        string mtlPath=Path.Combine(Application.dataPath,"Art",paletteId+".mtl");
        if(!File.Exists(objPath)||!File.Exists(mtlPath))
            throw new Exception("UNITY_LIBRARY_ASSET_MISSING:"+assetId+":"+paletteId);
        var vertices=new List<Vector3>();
        var partNames=new List<string>();
        var partFaces=new List<List<int>>();
        int currentPart=-1;
        foreach(string raw in File.ReadAllLines(objPath))
        {
            string line=raw.Trim();
            if(line.StartsWith("v ",StringComparison.Ordinal))
            {
                string[] f=line.Split(new[]{' ','\t'},StringSplitOptions.RemoveEmptyEntries);
                if(f.Length<4)throw new Exception("UNITY_LIBRARY_OBJ_VERTEX_INVALID:"+assetId);
                float x=float.Parse(f[1],CultureInfo.InvariantCulture);
                float y=float.Parse(f[2],CultureInfo.InvariantCulture);
                float z=float.Parse(f[3],CultureInfo.InvariantCulture);
                // 원본 Roblox Z-up을 Unity Y-up으로 회전하되 법선·와인딩의 방향은 유지한다.
                vertices.Add(new Vector3(x,z,-y));
            }
            else if(line.StartsWith("usemtl ",StringComparison.Ordinal))
            {
                string materialName=line.Substring(7).Trim();
                currentPart=partNames.IndexOf(materialName);
                if(currentPart<0)
                {
                    currentPart=partNames.Count;
                    partNames.Add(materialName);
                    partFaces.Add(new List<int>());
                }
            }
            else if(line.StartsWith("f ",StringComparison.Ordinal))
            {
                if(currentPart<0)throw new Exception("UNITY_LIBRARY_OBJ_MATERIAL_REQUIRED:"+assetId);
                string[] fields=line.Split(new[]{' ','\t'},StringSplitOptions.RemoveEmptyEntries);
                if(fields.Length<4)throw new Exception("UNITY_LIBRARY_OBJ_FACE_INVALID:"+assetId);
                var polygon=new List<int>();
                for(int i=1;i<fields.Length;i++)
                {
                    string pos=fields[i].Split('/')[0];
                    int index=int.Parse(pos,CultureInfo.InvariantCulture);
                    int resolved=index>0?index-1:vertices.Count+index;
                    if(resolved<0||resolved>=vertices.Count)throw new Exception("UNITY_LIBRARY_OBJ_INDEX_INVALID:"+assetId);
                    polygon.Add(resolved);
                }
                for(int i=1;i+1<polygon.Count;i++)
                {
                    partFaces[currentPart].Add(polygon[0]);
                    partFaces[currentPart].Add(polygon[i]);
                    partFaces[currentPart].Add(polygon[i+1]);
                }
            }
        }
        int totalTriangles=0;
        foreach(var triangles in partFaces)totalTriangles+=triangles.Count/3;
        if(vertices.Count<16||totalTriangles<16||partNames.Count==0)
            throw new Exception("UNITY_LIBRARY_OBJ_GEOMETRY_INCOMPLETE:"+assetId);
        string meshPath="Assets/Art/"+assetId+"-native.asset";
        Mesh mesh=AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
        if(mesh==null)
        {
            mesh=new Mesh();
            AssetDatabase.CreateAsset(mesh,meshPath);
        }
        mesh.Clear();
        mesh.name="Library_"+assetId;
        mesh.SetVertices(vertices);
        mesh.subMeshCount=partFaces.Count;
        for(int i=0;i<partFaces.Count;i++)mesh.SetTriangles(partFaces[i],i);
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        EditorUtility.SetDirty(mesh);

        // 재질: 원본 MTL Kd(색), Ks(반사), Ns(광택 지수), Ke(발광)를 직접 사용.
        // Ns는 Blinn-Phong → roughness≈sqrt(2/(Ns+2))로 변환한 뒤 매질별 상한 적용.
        var palette=new Dictionary<string,Color>(StringComparer.Ordinal);
        var specular=new Dictionary<string,Color>(StringComparer.Ordinal);
        var shininess=new Dictionary<string,float>(StringComparer.Ordinal);
        var emissions=new Dictionary<string,Color>(StringComparer.Ordinal);
        string currentMaterial="";
        foreach(string raw in File.ReadAllLines(mtlPath))
        {
            string[] tokens=raw.Trim().Split(new[]{' ','\t'},StringSplitOptions.RemoveEmptyEntries);
            if(tokens.Length<2)continue;
            if(tokens[0]=="newmtl")currentMaterial=tokens[1];
            else if(tokens[0]=="Kd"&&tokens.Length>=4&&!string.IsNullOrEmpty(currentMaterial))
                palette[currentMaterial]=new Color(
                    float.Parse(tokens[1],CultureInfo.InvariantCulture),
                    float.Parse(tokens[2],CultureInfo.InvariantCulture),
                    float.Parse(tokens[3],CultureInfo.InvariantCulture),1f);
            else if(tokens[0]=="Ks"&&tokens.Length>=4&&!string.IsNullOrEmpty(currentMaterial))
                specular[currentMaterial]=new Color(
                    Mathf.Clamp01(float.Parse(tokens[1],CultureInfo.InvariantCulture)),
                    Mathf.Clamp01(float.Parse(tokens[2],CultureInfo.InvariantCulture)),
                    Mathf.Clamp01(float.Parse(tokens[3],CultureInfo.InvariantCulture)),1f);
            else if(tokens[0]=="Ke"&&tokens.Length>=4&&!string.IsNullOrEmpty(currentMaterial))
                emissions[currentMaterial]=new Color(
                    float.Parse(tokens[1],CultureInfo.InvariantCulture),
                    float.Parse(tokens[2],CultureInfo.InvariantCulture),
                    float.Parse(tokens[3],CultureInfo.InvariantCulture),1f);
            else if(tokens[0]=="Ns"&&!string.IsNullOrEmpty(currentMaterial))
                shininess[currentMaterial]=Mathf.Max(0f,float.Parse(tokens[1],CultureInfo.InvariantCulture));
        }
        Shader surfaceShader=AssetDatabase.LoadAssetAtPath<Shader>(SurfaceShaderPath);
        Texture2D detailTexture=AssetDatabase.LoadAssetAtPath<Texture2D>(DetailTexturePath);
        if(surfaceShader==null||surfaceShader.name!="Jaewoon/LibrarySurface"||detailTexture==null)
            throw new Exception("UNITY_LIBRARY_PHYSICAL_RENDERER_MISSING");
        var assetMaterials=new Material[partNames.Count];
        for(int i=0;i<partNames.Count;i++)
        {
            string part=partNames[i];
            if(!palette.TryGetValue(part,out Color color))
                throw new Exception("UNITY_LIBRARY_MATERIAL_PALETTE_MISSING:"+assetId+":"+part);
            string materialPath="Assets/Materials/lib-"+paletteId+"-"+part+".mat";
            Material material=AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if(material==null)
            {
                material=new Material(surfaceShader);
                AssetDatabase.CreateAsset(material,materialPath);
            }
            else if(material.shader!=surfaceShader)material.shader=surfaceShader;

            float ns=Mathf.Min(1000f,shininess.ContainsKey(part)?shininess[part]:16f);
            float roughness=Mathf.Sqrt(2f/(ns+2f));
            float tiling,strength,smoothnessCap;
            GetMaterialSurfaceProfile(part,out tiling,out strength,out smoothnessCap);
            material.SetColor("_Color",color);
            material.SetColor("_SpecColor",specular.ContainsKey(part)?specular[part]:new Color(0.04f,0.04f,0.04f,1f));
            material.SetFloat("_Glossiness",Mathf.Min(Mathf.Clamp01(1f-roughness),smoothnessCap));
            material.SetFloat("_DetailTiling",tiling);
            material.SetFloat("_DetailStrength",strength);
            material.SetTexture("_DetailMap",detailTexture);
            Color emissive=emissions.ContainsKey(part)?emissions[part]:Color.black;
            material.SetColor("_EmissionColor",emissive);
            if(emissive.maxColorComponent>0.001f)material.EnableKeyword("_EMISSION");
            else material.DisableKeyword("_EMISSION");
            EditorUtility.SetDirty(material);
            assetMaterials[i]=material;
        }
        GameObject item=GameObject.Find(sceneName);
        if(item==null)
        {
            item=new GameObject(sceneName);
            UnityEngine.SceneManagement.SceneManager.MoveGameObjectToScene(item,scene);
        }
        MeshFilter filter=item.GetComponent<MeshFilter>();
        if(filter==null)filter=item.AddComponent<MeshFilter>();
        MeshRenderer renderer=item.GetComponent<MeshRenderer>();
        if(renderer==null)renderer=item.AddComponent<MeshRenderer>();
        filter.sharedMesh=mesh;
        renderer.sharedMaterials=assetMaterials;
        item.transform.position=position;
        item.transform.rotation=Quaternion.Euler(0f,yaw,0f);
        item.transform.localScale=Vector3.one*scale;
        if(mesh.bounds.size.x<=0.001f||mesh.bounds.size.y<=0.001f||mesh.bounds.size.z<=0.001f)
            throw new Exception("UNITY_LIBRARY_MESH_NOT_VOLUMETRIC:"+assetId);
        Debug.Log("UNITY_NATIVE_ASSET_SOURCE_BOUND game=monster-adventure model="+assetId+
                  " vertices="+vertices.Count+" triangles="+totalTriangles+" materials="+assetMaterials.Length);
    }

    // 재질 프로파일: 게임 로직과 무관하며 원본 표면 종류만 반영한다.
    private static void GetMaterialSurfaceProfile(string part,out float tiling,out float strength,out float smoothnessCap)
    {
        string id=part.ToUpperInvariant();
        if(id.Contains("GLASS")||id.Contains("WATER")||id.Contains("EYE")||id.Contains("CRYSTAL"))
        {tiling=3.0f;strength=0.015f;smoothnessCap=0.90f;}
        else if(id.Contains("METAL")||id.Contains("IRON")||id.Contains("GOLD")||id.Contains("BRONZE"))
        {tiling=3.4f;strength=0.045f;smoothnessCap=0.82f;}
        else if(id.Contains("STONE")||id.Contains("ROCK")||id.Contains("DIRT")||id.Contains("GROUND"))
        {tiling=1.25f;strength=0.18f;smoothnessCap=0.40f;}
        else if(id.Contains("WOOD")||id.Contains("BARK"))
        {tiling=1.6f;strength=0.14f;smoothnessCap=0.45f;}
        else if(id.Contains("LEAF")||id.Contains("GRASS")||id.Contains("MOSS")||id.Contains("FUR"))
        {tiling=2.1f;strength=0.12f;smoothnessCap=0.42f;}
        else
        {tiling=2.2f;strength=0.08f;smoothnessCap=0.60f;}
    }

    // 유틸: 주기값 노이즈로 128x128 공유 텍스처 1회 생성(밉맵·반복·삼선형 필터).
    private static void EnsureDetailTexture()
    {
        const int size=128;
        Texture2D detail=AssetDatabase.LoadAssetAtPath<Texture2D>(DetailTexturePath);
        if(detail!=null)
        {
            if(detail.width!=size||detail.height!=size)throw new Exception("UNITY_LIBRARY_DETAIL_VERSION_MISMATCH");
            return;
        }
        detail=new Texture2D(size,size,TextureFormat.RGBA32,true,true);
        detail.name="Library_Tileable_Microdetail";
        detail.wrapMode=TextureWrapMode.Repeat;
        detail.filterMode=FilterMode.Trilinear;
        detail.anisoLevel=1;
        var pixels=new Color[size*size];
        for(int y=0;y<size;y++)
        for(int x=0;x<size;x++)
        {
            float u=(x+0.5f)/size,v=(y+0.5f)/size;
            float coarse=0.65f*PeriodicNoise(u*8f,v*8f,8,17)+0.35f*PeriodicNoise(u*16f,v*16f,16,23);
            float fine=0.70f*PeriodicNoise(u*32f,v*32f,32,41)+0.30f*PeriodicNoise(u*64f,v*64f,64,43);
            float pores=0.60f*PeriodicNoise(u*16f,v*16f,16,61)+0.40f*PeriodicNoise(u*32f,v*32f,32,71);
            pixels[y*size+x]=new Color(coarse,fine,pores,1f);
        }
        detail.SetPixels(pixels);
        detail.Apply(true,false);
        AssetDatabase.CreateAsset(detail,DetailTexturePath);
        EditorUtility.SetDirty(detail);
    }

    // 헬퍼: 모서리를 이어 붙일 수 있는 부드러운 주기 노이즈, 저장·게임 난수와 분리.
    private static float PeriodicNoise(float x,float y,int period,int seed)
    {
        int ix=Mathf.FloorToInt(x),iy=Mathf.FloorToInt(y);
        float fx=x-ix,fy=y-iy;
        float tx=fx*fx*(3f-2f*fx),ty=fy*fy*(3f-2f*fy);
        int x0=((ix%period)+period)%period,y0=((iy%period)+period)%period;
        int x1=(x0+1)%period,y1=(y0+1)%period;
        float a=Mathf.Lerp(NoiseHash(x0,y0,seed),NoiseHash(x1,y0,seed),tx);
        float b=Mathf.Lerp(NoiseHash(x0,y1,seed),NoiseHash(x1,y1,seed),tx);
        return Mathf.Lerp(a,b,ty);
    }

    private static float NoiseHash(int x,int y,int seed)
    {
        unchecked
        {
            uint n=(uint)x*374761393u+(uint)y*668265263u+(uint)seed*1442695041u;
            n=(n^(n>>13))*1274126177u;
            n^=n>>16;
            return (n&65535u)/65535f;
        }
    }

}
#endif
