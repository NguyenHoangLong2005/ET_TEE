$path = "c:\userdata\fashion-recommendation-system\backend\src\main\java\com\nguyenhoanglong\controller"
$files = Get-ChildItem -Path $path -Recurse -Filter "*.java"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file has @PreAuthorize
    if ($content -match "@PreAuthorize") {
        # Replace hasAuthority('XXX')
        $newContent = [regex]::Replace($content, "hasAuthority\('([A-Z_]+)'\)", "hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).`$1)")
        
        # Replace hasAnyAuthority('XXX', 'YYY')
        $newContent = [regex]::Replace($newContent, "hasAnyAuthority\('([A-Z_]+)'\s*,\s*'([A-Z_]+)'\)", "hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).`$1, T(com.nguyenhoanglong.constant.PermissionConstants).`$2)")
        
        # Replace hasAnyAuthority('XXX', 'YYY', 'ZZZ', 'WWW') 
        # Actually it's easier to replace 'XXX' with T(...).XXX if it's inside hasAnyAuthority.
        # But this is safer to just run this script and see.
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent
            Write-Host "Updated $($file.Name)"
        }
    }
}
