// 파일명: unity-games/fantasy-survival/Assets/Editor/UnityCompanyAssets.cs
// 임포트 · 기존 UnityWebFloorBuild가 호출하는 회사 공용 스킨드 GLB → Unity 리그/모션 변환.
// 게임 로직·세이브·히트박스·전투 수치에는 접근하지 않는다.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Text;
using System.Security.Cryptography;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

internal static class UnityCompanyAssets
{
    [Serializable] private class Document
    {
        public Node[] nodes;
        public MeshData[] meshes;
        public Skin[] skins;
        public Accessor[] accessors;
        public BufferView[] bufferViews;
        public MaterialData[] materials;
        public Motion[] animations;
    }
    [Serializable] private class Node
    {
        public string name;
        public int[] children;
        public float[] translation, rotation, scale;
    }
    [Serializable] private class MeshData { public Primitive[] primitives; }
    [Serializable] private class Primitive { public Attributes attributes; public int indices, material; }
    [Serializable] private class Attributes { public int POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0; }
    [Serializable] private class Skin { public int[] joints; public int inverseBindMatrices, skeleton; }
    [Serializable] private class Accessor { public int bufferView, byteOffset, componentType, count; public string type; }
    [Serializable] private class BufferView { public int byteOffset, byteLength, byteStride; }
    [Serializable] private class MaterialData { public string name; public Pbr pbrMetallicRoughness; }
    [Serializable] private class Pbr
    {
        public float[] baseColorFactor;
        public float metallicFactor = 1f, roughnessFactor = 1f;
    }
    [Serializable] private class Motion { public string name; public Sampler[] samplers; public Channel[] channels; }
    [Serializable] private class Sampler { public int input, output; public string interpolation; }
    [Serializable] private class Channel { public int sampler; public Target target; }
    [Serializable] private class Target { public int node; public string path; }

    // 유틸 · 바이너리 액세서 읽기. Float/uint/ushort와 VEC/MAT 등 원본 형식을 검증한다.
    private static float Number(Document doc, byte[] bytes, int accessor, int element, int component)
    {
        if (accessor < 0 || accessor >= doc.accessors.Length) throw new Exception("UNITY_COMPANY_ACCESSOR_MISSING");
        Accessor a = doc.accessors[accessor];
        int dims = a.type == "SCALAR" ? 1 : a.type == "VEC2" ? 2 : a.type == "VEC3" ? 3
            : a.type == "VEC4" ? 4 : a.type == "MAT4" ? 16 : 0;
        int width = a.componentType == 5126 || a.componentType == 5125 ? 4
            : a.componentType == 5123 || a.componentType == 5122 ? 2
            : a.componentType == 5121 ? 1 : 0;
        if (dims == 0 || width == 0 || element < 0 || element >= a.count
            || component < 0 || component >= dims || a.bufferView < 0
            || a.bufferView >= doc.bufferViews.Length) throw new Exception("UNITY_COMPANY_ACCESSOR_INVALID");
        BufferView view = doc.bufferViews[a.bufferView];
        int stride = view.byteStride > 0 ? view.byteStride : width * dims;
        int offset = view.byteOffset + a.byteOffset + element * stride + component * width;
        if (offset < 0 || offset + width > bytes.Length) throw new Exception("UNITY_COMPANY_ACCESSOR_BOUNDS");
        if (a.componentType == 5126) return BitConverter.ToSingle(bytes, offset);
        if (a.componentType == 5125) return BitConverter.ToUInt32(bytes, offset);
        if (a.componentType == 5123) return BitConverter.ToUInt16(bytes, offset);
        if (a.componentType == 5122) return BitConverter.ToInt16(bytes, offset);
        return bytes[offset];
    }

    private static Vector3 Vector(Document doc, byte[] bytes, int id, int index)
    {
        return new Vector3(-Number(doc, bytes, id, index, 0),
            Number(doc, bytes, id, index, 1), Number(doc, bytes, id, index, 2));
    }

    private static Quaternion Rotation(float[] raw)
    {
        return raw != null && raw.Length == 4
            ? new Quaternion(raw[0], -raw[1], -raw[2], raw[3]).normalized : Quaternion.identity;
    }

    // 그래픽 · 원본 실제 메시와 Joint/Weight/BindPose를 그대로 유지하여 Unity 스킨드 메시를 만든다.
    private static Mesh MakeMesh(string key, Document doc, byte[] bytes)
    {
        if (doc.meshes == null || doc.meshes.Length == 0 || doc.meshes[0].primitives == null
            || doc.skins == null || doc.skins.Length == 0 || doc.skins[0].joints == null)
            throw new Exception("UNITY_COMPANY_SKINNED_MODEL_REQUIRED:" + key);
        var vertices = new List<Vector3>();
        var normals = new List<Vector3>();
        var uv = new List<Vector2>();
        var weights = new List<BoneWeight>();
        var groups = new List<int[]>();
        foreach (Primitive primitive in doc.meshes[0].primitives)
        {
            if (primitive.attributes == null) throw new Exception("UNITY_COMPANY_VERTEX_ATTRIBUTES_MISSING:" + key);
            Attributes attr = primitive.attributes;
            int first = vertices.Count;
            int count = doc.accessors[attr.POSITION].count;
            for (int i = 0; i < count; i++)
            {
                vertices.Add(Vector(doc, bytes, attr.POSITION, i));
                normals.Add(Vector(doc, bytes, attr.NORMAL, i).normalized);
                uv.Add(new Vector2(Number(doc, bytes, attr.TEXCOORD_0, i, 0),
                    Number(doc, bytes, attr.TEXCOORD_0, i, 1)));
                weights.Add(new BoneWeight {
                    boneIndex0 = (int)Number(doc, bytes, attr.JOINTS_0, i, 0),
                    boneIndex1 = (int)Number(doc, bytes, attr.JOINTS_0, i, 1),
                    boneIndex2 = (int)Number(doc, bytes, attr.JOINTS_0, i, 2),
                    boneIndex3 = (int)Number(doc, bytes, attr.JOINTS_0, i, 3),
                    weight0 = Number(doc, bytes, attr.WEIGHTS_0, i, 0),
                    weight1 = Number(doc, bytes, attr.WEIGHTS_0, i, 1),
                    weight2 = Number(doc, bytes, attr.WEIGHTS_0, i, 2),
                    weight3 = Number(doc, bytes, attr.WEIGHTS_0, i, 3)
                });
            }
            int indexCount = doc.accessors[primitive.indices].count;
            if (indexCount < 3 || indexCount % 3 != 0) throw new Exception("UNITY_COMPANY_TRIANGLES_INVALID:" + key);
            var triangles = new int[indexCount];
            for (int i = 0; i < indexCount; i += 3)
            {
                // 오른손 GLTF 좌표 → 왼손 Unity X반전. 표면 법선의 면 순서도 반전.
                triangles[i] = first + (int)Number(doc, bytes, primitive.indices, i, 0);
                triangles[i + 1] = first + (int)Number(doc, bytes, primitive.indices, i + 2, 0);
                triangles[i + 2] = first + (int)Number(doc, bytes, primitive.indices, i + 1, 0);
            }
            groups.Add(triangles);
        }
        var mesh = new Mesh { name = "MagicForest" + key + "_RigMesh" };
        if (vertices.Count > 65535) mesh.indexFormat = IndexFormat.UInt32;
        mesh.SetVertices(vertices);
        mesh.SetNormals(normals);
        mesh.SetUVs(0, uv);
        mesh.boneWeights = weights.ToArray();
        Skin skin = doc.skins[0];
        var bindposes = new Matrix4x4[skin.joints.Length];
        Matrix4x4 flip = Matrix4x4.Scale(new Vector3(-1, 1, 1));
        for (int i = 0; i < bindposes.Length; i++)
        {
            int a = skin.inverseBindMatrices;
            Matrix4x4 glb = new Matrix4x4(
                new Vector4(Number(doc, bytes, a, i, 0), Number(doc, bytes, a, i, 1),
                    Number(doc, bytes, a, i, 2), Number(doc, bytes, a, i, 3)),
                new Vector4(Number(doc, bytes, a, i, 4), Number(doc, bytes, a, i, 5),
                    Number(doc, bytes, a, i, 6), Number(doc, bytes, a, i, 7)),
                new Vector4(Number(doc, bytes, a, i, 8), Number(doc, bytes, a, i, 9),
                    Number(doc, bytes, a, i, 10), Number(doc, bytes, a, i, 11)),
                new Vector4(Number(doc, bytes, a, i, 12), Number(doc, bytes, a, i, 13),
                    Number(doc, bytes, a, i, 14), Number(doc, bytes, a, i, 15)));
            bindposes[i] = flip * glb * flip;
        }
        mesh.bindposes = bindposes;
        mesh.subMeshCount = groups.Count;
        for (int i = 0; i < groups.Count; i++) mesh.SetTriangles(groups[i], i, false);
        mesh.RecalculateBounds();
        if (mesh.vertexCount < 100 || mesh.boneWeights.Length != mesh.vertexCount)
            throw new Exception("UNITY_COMPANY_ACTOR_GEOMETRY_OR_WEIGHTS_INVALID:" + key);
        return mesh;
    }

    // 모션 · GLB 관절 회전/위치 키프레임을 Unity AnimationClip으로 변환한다.
    private static AnimationClip MakeClip(Document doc, byte[] bytes, Motion source, Transform[] nodes, Transform root)
    {
        var clip = new AnimationClip { name = source.name, legacy = true, frameRate = 30 };
        bool loop = source.name.Contains("IDLE") || source.name == "WALK" || source.name == "RUN"
            || source.name == "SPRINT" || source.name.Contains("LOOP") || source.name.Contains("STALK");
        clip.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
        foreach (Channel channel in source.channels)
        {
            if (channel.target == null || channel.target.node < 0 || channel.target.node >= nodes.Length
                || channel.sampler < 0 || channel.sampler >= source.samplers.Length) continue;
            Sampler sampler = source.samplers[channel.sampler];
            string interpolation = string.IsNullOrEmpty(sampler.interpolation) ? "LINEAR" : sampler.interpolation;
            if (interpolation != "LINEAR" && interpolation != "STEP")
                throw new Exception("UNITY_COMPANY_ACTION_INTERPOLATION_INVALID:" + source.name);
            int count = doc.accessors[sampler.input].count;
            if (count != doc.accessors[sampler.output].count)
                throw new Exception("UNITY_COMPANY_ACTION_FRAME_COUNT_INVALID:" + source.name);
            bool rotated = channel.target.path == "rotation";
            bool scaled = channel.target.path == "scale";
            if (!rotated && !scaled && channel.target.path != "translation")
                throw new Exception("UNITY_COMPANY_ACTION_CHANNEL_UNSUPPORTED:" + source.name);
            string property = rotated ? "localRotation." : scaled ? "localScale." : "localPosition.";
            var curves = new AnimationCurve[rotated ? 4 : 3];
            for (int i = 0; i < curves.Length; i++) curves[i] = new AnimationCurve();
            Quaternion previous = Quaternion.identity;
            for (int i = 0; i < count; i++)
            {
                float time = Number(doc, bytes, sampler.input, i, 0);
                var values = new float[curves.Length];
                if (rotated)
                {
                    Quaternion q = new Quaternion(
                        Number(doc, bytes, sampler.output, i, 0),
                        -Number(doc, bytes, sampler.output, i, 1),
                        -Number(doc, bytes, sampler.output, i, 2),
                        Number(doc, bytes, sampler.output, i, 3)).normalized;
                    if (i > 0 && Quaternion.Dot(previous, q) < 0f)
                        q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
                    values[0] = q.x; values[1] = q.y; values[2] = q.z; values[3] = q.w;
                    previous = q;
                }
                else
                {
                    values[0] = (scaled ? 1f : -1f) * Number(doc, bytes, sampler.output, i, 0);
                    values[1] = Number(doc, bytes, sampler.output, i, 1);
                    values[2] = Number(doc, bytes, sampler.output, i, 2);
                }
                for (int k = 0; k < curves.Length; k++) curves[k].AddKey(new Keyframe(time, values[k]));
            }
            string path = AnimationUtility.CalculateTransformPath(nodes[channel.target.node], root);
            for (int k = 0; k < curves.Length; k++)
            {
                // 원본 STEP은 고정 포즈, LINEAR는 직선 보간. 기본 0 탄젠트의 가감속을 덧씌우지 않는다.
                var tangent = interpolation == "STEP" ? AnimationUtility.TangentMode.Constant
                    : AnimationUtility.TangentMode.Linear;
                for (int i = 0; i < count; i++)
                {
                    AnimationUtility.SetKeyBroken(curves[k], i, true);
                    AnimationUtility.SetKeyLeftTangentMode(curves[k], i, tangent);
                    AnimationUtility.SetKeyRightTangentMode(curves[k], i, tangent);
                }
                clip.SetCurve(path, typeof(Transform), property + "xyzw"[k], curves[k]);
                // 실제 Unity 커브를 중간 시점에 평가해 텍스트 표기만으로 보간 통과를 만들지 않는다.
                for (int i = 1; i < count; i++)
                {
                    Keyframe left = curves[k].keys[i - 1], right = curves[k].keys[i];
                    float sampleTime = Mathf.Lerp(left.time, right.time, .25f);
                    float expected = interpolation == "STEP" ? left.value : Mathf.Lerp(left.value, right.value, .25f);
                    if (Mathf.Abs(curves[k].Evaluate(sampleTime) - expected) > .0001f)
                        throw new Exception("UNITY_COMPANY_ACTION_INTERPOLATION_LOSS:" + source.name);
                }
            }
        }
        if (clip.empty) throw new Exception("UNITY_COMPANY_EMPTY_ACTION:" + source.name);
        return clip;
    }

    private static void PrepareActor(string key)
    {
        string source = "Assets/Editor/MagicForest" + key + ".bytes";
        string output = "Assets/Resources/CompanyAssets/MagicForest" + key;
        string prefab = output + ".prefab";
        // 임포트 · 원본 GLB와 변환 책임 코드의 실제 해시를 프리팹 임포터에 고정한다.
        // 콘텐츠·임포터가 바뀌면 반드시 다시 변환하고, 동일한 정상 리그/클립은 재사용한다.
        string project = Directory.GetParent(Application.dataPath).FullName;
        string physical = Path.Combine(project, source);
        if (!File.Exists(physical)) throw new Exception("UNITY_COMPANY_MASTER_NOT_FOUND:" + source);
        byte[] glb = File.ReadAllBytes(physical);
        string importerSource = Path.Combine(project, "Assets/Editor/UnityCompanyAssets.cs");
        if (!File.Exists(importerSource)) throw new Exception("UNITY_COMPANY_IMPORTER_SOURCE_MISSING");
        string sourceIdentity;
        using (SHA256 sha = SHA256.Create())
        {
            byte[] modelDigest = sha.ComputeHash(glb);
            byte[] importerDigest = sha.ComputeHash(File.ReadAllBytes(importerSource));
            sourceIdentity = "MAGIC_FOREST_SKINNED_GLBSHA256_V1:"
                + BitConverter.ToString(modelDigest).Replace("-", "")
                + ":" + BitConverter.ToString(importerDigest).Replace("-", "");
        }
        GameObject existing = AssetDatabase.LoadAssetAtPath<GameObject>(prefab);
        AssetImporter existingImporter = AssetImporter.GetAtPath(prefab);
        Animation existingMotion = existing != null ? existing.GetComponent<Animation>() : null;
        SkinnedMeshRenderer existingSkin = existing != null
            ? existing.GetComponentInChildren<SkinnedMeshRenderer>(true) : null;
        if (existingImporter != null && existingImporter.userData == sourceIdentity
            && existingMotion != null && existingMotion.GetClipCount() >= 5
            && existingSkin != null && existingSkin.sharedMesh != null
            && existingSkin.sharedMesh.vertexCount >= 100 && existingSkin.bones != null
            && existingSkin.bones.Length >= 3 && existingSkin.sharedMesh.bindposes.Length >= 3)
        {
            Debug.Log("MAGIC_FOREST_NATIVE_SKINNED_CACHE=SOURCE_HASH_MATCH_RUNTIME_QA_PENDING key=" + key);
            return;
        }
        if (glb.Length < 32 || BitConverter.ToUInt32(glb, 0) != 0x46546C67u
            || BitConverter.ToUInt32(glb, 4) != 2 || BitConverter.ToUInt32(glb, 16) != 0x4E4F534Au)
            throw new Exception("UNITY_COMPANY_INVALID_GLB:" + key);
        int jsonSize = BitConverter.ToInt32(glb, 12);
        int binaryChunk = 20 + jsonSize;
        if (jsonSize < 50 || binaryChunk + 8 >= glb.Length ||
            BitConverter.ToUInt32(glb, binaryChunk + 4) != 0x004E4942u)
            throw new Exception("UNITY_COMPANY_GLB_BIN_MISSING:" + key);
        int binSize = BitConverter.ToInt32(glb, binaryChunk);
        if (binSize <= 0 || binaryChunk + 8 + binSize > glb.Length)
            throw new Exception("UNITY_COMPANY_GLB_BIN_BOUNDS:" + key);
        var binary = new byte[binSize];
        Buffer.BlockCopy(glb, binaryChunk + 8, binary, 0, binSize);
        Document doc = JsonUtility.FromJson<Document>(
            Encoding.UTF8.GetString(glb, 20, jsonSize).TrimEnd('\0', ' '));
        if (doc == null || doc.nodes == null || doc.skins == null || doc.skins.Length != 1
            || doc.animations == null || doc.animations.Length < 5 || doc.materials == null)
            throw new Exception("UNITY_COMPANY_RIG_ACTIONS_REQUIRED:" + key);
        GameObject root = new GameObject("MagicForest" + key);
        try
        {
            Transform[] nodes = new Transform[doc.nodes.Length];
            int[] parents = new int[nodes.Length];
            for (int i = 0; i < parents.Length; i++) parents[i] = -1;
            for (int i = 0; i < nodes.Length; i++)
                if (doc.nodes[i].children != null)
                    foreach (int child in doc.nodes[i].children)
                    {
                        if (child < 0 || child >= nodes.Length || parents[child] >= 0)
                            throw new Exception("UNITY_COMPANY_INVALID_JOINT_TREE:" + key);
                        parents[child] = i;
                    }
            for (int i = 0; i < nodes.Length; i++)
                nodes[i] = new GameObject(string.IsNullOrEmpty(doc.nodes[i].name)
                    ? "Node" + i : doc.nodes[i].name).transform;
            for (int i = 0; i < nodes.Length; i++)
            {
                Node row = doc.nodes[i];
                nodes[i].SetParent(parents[i] < 0 ? root.transform : nodes[parents[i]], false);
                if (row.translation != null && row.translation.Length == 3)
                    nodes[i].localPosition = new Vector3(-row.translation[0], row.translation[1], row.translation[2]);
                nodes[i].localRotation = Rotation(row.rotation);
                if (row.scale != null && row.scale.Length == 3)
                    nodes[i].localScale = new Vector3(row.scale[0], row.scale[1], row.scale[2]);
            }
            Mesh mesh = MakeMesh(key, doc, binary);
            string meshPath = output + "Mesh.asset";
            if (AssetDatabase.LoadAssetAtPath<Mesh>(meshPath) != null) AssetDatabase.DeleteAsset(meshPath);
            AssetDatabase.CreateAsset(mesh, meshPath);
            var materials = new List<Material>();
            for (int i = 0; i < doc.meshes[0].primitives.Length; i++)
            {
                int matIndex = doc.meshes[0].primitives[i].material;
                MaterialData row = matIndex >= 0 && matIndex < doc.materials.Length ? doc.materials[matIndex] : null;
                string matPath = output + "Material" + i + ".mat";
                if (AssetDatabase.LoadAssetAtPath<Material>(matPath) != null) AssetDatabase.DeleteAsset(matPath);
                // 재질 · 활성 렌더러에 맞는 PBR 셰이더와 원본 금속성/거칠기를 보존한다.
                bool universal = GraphicsSettings.currentRenderPipeline != null;
                Shader shader = Shader.Find(universal ? "Universal Render Pipeline/Lit" : "Standard");
                if (shader == null) throw new Exception("UNITY_COMPANY_NATIVE_SHADER_MISSING");
                var mat = new Material(shader) { name = key + "_" + i };
                float[] rgb = row != null && row.pbrMetallicRoughness != null
                    ? row.pbrMetallicRoughness.baseColorFactor : null;
                mat.color = rgb != null && rgb.Length >= 3
                    ? new Color(rgb[0], rgb[1], rgb[2], rgb.Length > 3 ? rgb[3] : 1f) : Color.white;
                Pbr pbr = row != null ? row.pbrMetallicRoughness : null;
                float metallic = pbr != null ? pbr.metallicFactor : 1f;
                float roughness = pbr != null ? pbr.roughnessFactor : 1f;
                if (float.IsNaN(metallic) || float.IsNaN(roughness)
                    || metallic < 0f || metallic > 1f || roughness < 0f || roughness > 1f)
                    throw new Exception("UNITY_COMPANY_PBR_FACTOR_INVALID:" + key);
                mat.SetFloat("_Metallic", metallic);
                string smoothnessProperty = universal ? "_Smoothness" : "_Glossiness";
                mat.SetFloat(smoothnessProperty, 1f - roughness);
                AssetDatabase.CreateAsset(mat, matPath);
                Material persistedMaterial = AssetDatabase.LoadAssetAtPath<Material>(matPath);
                if (persistedMaterial == null || !persistedMaterial.HasProperty("_Metallic")
                    || !persistedMaterial.HasProperty(smoothnessProperty)
                    || Mathf.Abs(persistedMaterial.GetFloat("_Metallic") - metallic) > .0001f
                    || Mathf.Abs(persistedMaterial.GetFloat(smoothnessProperty) - (1f - roughness)) > .0001f)
                    throw new Exception("UNITY_COMPANY_PBR_CONVERSION_LOSS:" + key);
                materials.Add(mat);
            }
            Skin skin = doc.skins[0];
            var skinned = nodes[nodes.Length - 1].gameObject.AddComponent<SkinnedMeshRenderer>();
            skinned.sharedMesh = mesh;
            skinned.sharedMaterials = materials.ToArray();
            var bones = new Transform[skin.joints.Length];
            for (int i = 0; i < bones.Length; i++) bones[i] = nodes[skin.joints[i]];
            skinned.bones = bones;
            skinned.rootBone = nodes[skin.skeleton];
            skinned.updateWhenOffscreen = false;
            var animation = root.AddComponent<Animation>();
            // 모션 · 동적 AddClip 상태만이 아니라 프리팹 직렬화 대상 클립 배열을 직접 저장한다.
            var actionClips = new List<AnimationClip>();
            foreach (Motion action in doc.animations)
            {
                if (string.IsNullOrEmpty(action.name)) continue;
                AnimationClip clip = MakeClip(doc, binary, action, nodes, root.transform);
                string clipPath = output + "_" + action.name + ".anim";
                if (AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath) != null) AssetDatabase.DeleteAsset(clipPath);
                AssetDatabase.CreateAsset(clip, clipPath);
                animation.AddClip(clip, action.name);
                actionClips.Add(clip);
            }
            // 에디터 메모리에만 존재하는 AnimationState가 빌드 시 유실되지 않도록
            // 기존 Animation 컴포넌트의 직렬화된 참조를 정식 Editor API로 고정한다.
            if (actionClips.Count != doc.animations.Length)
                throw new Exception("UNITY_COMPANY_ACTION_CLIP_COUNT_MISMATCH:" + key);
            AnimationUtility.SetAnimationClips(animation, actionClips.ToArray());
            animation.clip = actionClips.Find(clip => clip.name == "IDLE_BREATH") ?? actionClips[0];
            animation.playAutomatically = true;
            if (animation.clip == null) throw new Exception("UNITY_COMPANY_IDLE_CLIP_MISSING:" + key);
            GameObject native = PrefabUtility.SaveAsPrefabAsset(root, prefab);
            if (native == null || native.GetComponentInChildren<SkinnedMeshRenderer>() == null)
                throw new Exception("UNITY_COMPANY_PREFAB_INVALID:" + key);
            AssetImporter importer = AssetImporter.GetAtPath(prefab);
            if (importer != null)
            {
                importer.userData = sourceIdentity;
                importer.SaveAndReimport();
            }
            else Debug.LogWarning("MAGIC_FOREST_NATIVE_CACHE_METADATA_MISSING key=" + key);
            // 프리팹을 저장하고 재임포트한 뒤에도 실제 모든 액션 참조가 남았는지 검증.
            GameObject persisted = AssetDatabase.LoadAssetAtPath<GameObject>(prefab);
            Animation persistedAnimation = persisted != null ? persisted.GetComponent<Animation>() : null;
            AnimationClip[] persistedClips = persisted != null
                ? AnimationUtility.GetAnimationClips(persisted) : Array.Empty<AnimationClip>();
            if (persistedAnimation == null || persistedClips.Length < actionClips.Count)
                throw new Exception("UNITY_COMPANY_PERSISTED_ACTION_CLIPS_MISSING:" + key);
            foreach (AnimationClip actionClip in actionClips)
                if (Array.Find(persistedClips, clip => clip != null && clip.name == actionClip.name) == null)
                    throw new Exception("UNITY_COMPANY_PERSISTED_ACTION_CLIP_MISSING:" + key + ":" + actionClip.name);
            Debug.Log("MAGIC_FOREST_NATIVE_SKINNED_ACTION=SOURCE_READY_RUNTIME_QA_PENDING key=" + key
                + " vertices=" + mesh.vertexCount + " joints=" + bones.Length
                + " actions=" + doc.animations.Length);
        }
        finally { UnityEngine.Object.DestroyImmediate(root); }
    }

    // 메인 · 기존 프로젝트의 네이티브 빌드 절차가 직접 호출. 로블록스 런타임 자산 재사용 금지.
    internal static void Prepare()
    {
        foreach (string key in new[] { "Traveler", "Rogue", "Guardian", "Archer", "Mage",
            "Wolf", "Golem", "Spider", "Serpent", "Beetle" })
            PrepareActor(key);
        AssetDatabase.SaveAssets();
    }
}
#endif
