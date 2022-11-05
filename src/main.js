import { getBlockAttrs,setBlockAttrs,updateBlock,sql as querySql} from "./api.js";

// 获取挂件id
function getWidgetId() {
    var url = new URL(window.location.href);
    var widgetId = url.searchParams.get('id') || window.frameElement.parentElement.parentElement.getAttribute('data-node-id');
    return widgetId;
}


// 切换设置面板
function toggleSetting(ev={}){
    var force = ev.force;
    let settingBox = document.querySelector("#settingBox");
    
    // force为真代表强制显示
    if(settingBox.classList.contains("hide") || force){
        settingBox.classList.remove("hide");
    }else{
        settingBox.classList.add("hide");
    }
}


// 校验sql和嵌入块id，写入块属性，并关闭设置面板
function checkSetting(){
    let qrkid = document.querySelector("#qrkid").value;
    let sql = document.querySelector("#sql").value;

    if(!qrkid || !sql){
        alert("请输入嵌入块id和sql");
        return;
    }
        
    if(!Pg.pageData){
        Pg.pageData = {};
    }
    Pg.pageData["qrkid"] = qrkid;
    Pg.pageData["sql"] = sql;

    // 写入块属性
    toggleSetting();//关闭面板
    updateWidgetAttr();
    refreshEmbeddedBlock();
}

async function render(){
    Pg.widgetId = getWidgetId();

    // 获取挂件属性   
    let res = await getBlockAttrs(Pg.widgetId);
    let pageData = JSON.parse(res["custom-page-data"] || null);
    Pg.pageData = pageData;

    // 判断配置是否正常
    if(!pageData){
        toggleSetting({force:true});
    }else{
        document.querySelector("#qrkid").value = pageData.qrkid || "";
        document.querySelector("#sql").value = pageData.sql || "";

        //回写页码、总页码、条数
        document.querySelector("#querycount").value = Pg.pageData.pageCount;
        document.querySelector("#pageNum").value = Pg.pageData.pageNum;
        document.querySelector("#pagetotal").innerText = Pg.pageData.pageTotal;
        
        if(!pageData.qrkid || !pageData.sql){
            toggleSetting({force:true});
        }
    }

    // 设置各种事件
    document.querySelector("#settingBtn").onclick = toggleSetting;
    document.querySelector("#checkBtn").onclick = checkSetting;

    document.querySelector("#first").onclick = first;
    document.querySelector("#pre").onclick = pre;
    document.querySelector("#next").onclick = next;
    document.querySelector("#querycount").onchange = changeCount;
    document.querySelector("#pageNum").onchange = jumpTo;
    document.querySelector("#block_beginning").onclick = jumpToBlockBeginning;
}

// 更新嵌入块的sql
function refreshEmbeddedBlock(){
    // alert("更新嵌入块");

    var pageNum = parseInt(document.querySelector("#pageNum").value || 1);
    var querycount = parseInt(document.querySelector("#querycount").value || 5);
    var sql = Pg.pageData.sql.replaceAll('\n',' ');//将多行转一行
    
    var pagetotal_sql = `select count(*)/${querycount}.0 as total from ( ${sql} )`;
    sql = `select * from (${sql}) limit ${(pageNum-1) * querycount} , ${querycount}`;

    Pg.pageData.pageCount  = querycount; //条数
    Pg.pageData.pageNum = pageNum;   //页码

    //查询总页数
    querySql(pagetotal_sql).then((data)=>{
        var total = Math.ceil(data[0].total);
        refresh_pagetotal(total);//更新总页数
        Pg.pageData.pageTotal = total;

        // 更新查询sql
        updateBlock(Pg.pageData.qrkid,"markdown","{{" + sql + "}}").then(()=>{
            updateWidgetAttr();
            setTimeout(jumpToBlockBeginning,1000);//回到块首
        });
    });
    
}


// 更新分页数据到挂件属性
async function updateWidgetAttr(){
    await setBlockAttrs(Pg.widgetId, {"custom-page-data":JSON.stringify(Pg.pageData)}  );
}


function changeCount() {
    first()
}

function jumpTo() {
    refreshEmbeddedBlock();
}

function first() {
    document.querySelector("#pageNum").value = 1;
    refreshEmbeddedBlock();
}

function pre() {
    var pageNum = parseInt(document.querySelector("#pageNum").value || 1);
    if (pageNum <= 1) {
        return;
    }
    document.querySelector("#pageNum").value = pageNum - 1;
    refreshEmbeddedBlock();
}
function next() {
    var pageNum = parseInt(document.querySelector("#pageNum").value || 1);
    document.querySelector("#pageNum").value = pageNum + 1;
    refreshEmbeddedBlock();
}
function refresh_pagetotal(total) {
    document.querySelector("#pagetotal").innerText = total;
}

function jumpToBlockBeginning(){
    jumpToBlock(Pg.pageData.qrkid);
    // let block_url = "siyuan://blocks/"+Pg.pageData.qrkid;
    // window.open(block_url);
    // window.parent.require('child_process').exec("start "+block_url, null);
}

// 跳转到块 copy from:siyuan-theme-dark-plus
function jumpToBlock(id, callback = null) {
    if (window == top) {
        // 使用新窗口
        if (document.referrer){
            // 不支持浏览器使用新窗口跳转块
            console.error("跳转块失败！")
            alert("不支持浏览器使用新窗口跳转块");
        }else{
            //使用新窗口打开的（仅用于桌面端）
            let block_url = "siyuan://blocks/" + id;
            window.open(block_url);
        }
    } else {
        //未使用新窗口
        const editor = window.top.document.querySelector('div.protyle-wysiwyg div[data-node-id] div[contenteditable][spellcheck]');
        if (editor) {
            let ref = document.createElement("span");
            ref.setAttribute("data-type", "block-ref");
            ref.setAttribute("data-subtype", "s");
            ref.setAttribute("data-id", id);
            editor.appendChild(ref);
            ref.click();
            ref.remove();
            if (typeof callback === 'function') setTimeout(callback, 100);
        }
        else {
            console.error("跳转块失败！")
        };
    }
}


let Pg = {};//全局变量

// render();//渲染
setTimeout(render, 0);
