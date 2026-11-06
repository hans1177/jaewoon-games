// 파일명: Assets/Materials/LibrarySurface.shader
// 렌더링: UV 없는 실제 메시용 삼축 투영 + Unity Standard Specular 물리 기반 조명.
// 원리 출처: https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/shaders/writing-shaders-birp/built-in-shader-examples/tri-planar-texturing
// 평활도: https://docs.unity.cn/6000.1/Documentation/Manual/StandardShaderMaterialParameterSmoothness.html
// 수학적 원리만 독립 구현하며 외부 코드는 복사하지 않음. 기존 게임판정·모델·저장 불변.
Shader "Jaewoon/LibrarySurface"
{
    Properties
    {
        _Color ("Original Color", Color) = (1,1,1,1)
        _SpecColor ("Original Specular", Color) = (0.04,0.04,0.04,1)
        _Glossiness ("Physical Smoothness", Range(0,1)) = 0.4
        [NoScaleOffset] _DetailMap ("Tileable Microtexture", 2D) = "gray" {}
        _DetailTiling ("World Detail Frequency", Range(0.2,8)) = 2.0
        _DetailStrength ("Microdetail Intensity", Range(0,0.3)) = 0.1
        [HDR] _EmissionColor ("Original Emission", Color) = (0,0,0,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 240
        CGPROGRAM
        #pragma target 3.0
        #pragma surface surf StandardSpecular fullforwardshadows
        sampler2D _DetailMap;
        fixed4 _Color;
        half4 _SpecColor;
        half _Glossiness;
        half _DetailTiling;
        half _DetailStrength;
        half4 _EmissionColor;

        struct Input { float3 worldPos; float3 worldNormal; };

        void surf(Input IN, inout SurfaceOutputStandardSpecular o)
        {
            // 메시 표면 법선으로 세 투영면을 연결한다. UV와 탠전트가 필요 없다.
            half3 weight = pow(abs(normalize(IN.worldNormal)), half3(4.0h,4.0h,4.0h));
            weight /= max(weight.x + weight.y + weight.z, 0.0001h);
            float3 p = IN.worldPos * _DetailTiling;
            half3 detail = tex2D(_DetailMap, p.yz).rgb * weight.x
                         + tex2D(_DetailMap, p.zx).rgb * weight.y
                         + tex2D(_DetailMap, p.xy).rgb * weight.z;
            // 밉맵이 있는 공유 저해상도 텍스처 3회 샘플: 모바일 GPU 비용 제한.
            half variation = (detail.r - 0.5h) * 1.5h + (detail.g - 0.5h) * 0.5h;
            o.Albedo = saturate(_Color.rgb * (1.0h + variation * _DetailStrength));
            o.Specular = saturate(_SpecColor.rgb);
            o.Smoothness = saturate(_Glossiness + (detail.b - 0.5h) * _DetailStrength * 0.45h);
            o.Occlusion = 1.0h;
            o.Emission = _EmissionColor.rgb;
            o.Alpha = 1.0h;
        }
        ENDCG
    }
    Fallback "Standard (Specular setup)"
}
