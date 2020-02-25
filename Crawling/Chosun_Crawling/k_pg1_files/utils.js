function checkFileExt(e){
	var acceptFileExt = [
		'jpg', 'png', 'xls', 'xlsx', 'doc', 'docx', 'hwp', 'pdf',
		'JPG', 'PNG', 'XLS', 'XLSX', 'DOC', 'DOCX', 'HWP', 'PDF'
	];
	var $obj = $(e);
	
	if(e.files.length > 0){
		$.each(e.files, function(i, v){
			var fileExt = v.name.substring(v.name.lastIndexOf('.')+1, v.name.length);
			if(acceptFileExt.indexOf(fileExt) == -1){
				alert('첨부할 수 없는 확장자의 파일이 등록되었습니다.');
				$obj.val('');
			}
		});
	}
	
}