/**
 * Created by Palell90 on 24.01.2015.
 */
var graphics;
var graphics2d;
var canvas;
var canvas_texture;
var status_info;
var message_box;
var message_box_header;
var massage_box_content;
var vertex_shader_source = "" +
    "attribute vec3 position;" +
    "attribute vec4 color;" +
    "attribute vec3 normal;" +
    "uniform mat4 world;" +
    "uniform mat4 view;" +
    "uniform mat4 projection;" +
    "varying vec4 vertexColor;" +
    "varying vec3 vertexNormal;" +
    "void main()" +
    "{" +
    "   vertexNormal = normal;" +
    "   vertexColor = color;" +
    "   gl_Position = projection * view * world * vec4(position,1.0);" +
    "}";
var fragment_shader_source = "" +
    "precision mediump float;" +
    "varying vec4 vertexColor;" +
    "varying vec3 normal; " +
    "void main()" +
    "{" +
    "  gl_FragColor = vertexColor;" +
    "}";
var shader_program;
var position_attribute;
var color_attribute;
var normal_attribute;
var heights = [];
const num_samples = 100;
var azimuth_speed = 2;
var elapsed_time = 0;
var delta_time = 0;
var ended = false;
DrawingMode =
{
    SINGLE_BAR : 0,
    MULTI_BAR : 1,
    SURFACE : 2
}

CameraMode =
{
    FREE : 0,
    ORBIT : 1
}

var current_drawing_mode = DrawingMode.SINGLE_BAR;
var current_camera_mode = CameraMode.ORBIT;

var last_mouse_position_X = 0;
var last_mouse_position_Y = 0;
var mouse_is_down = false;
const arrow_key_code_left = 37;
const arrow_key_code_right = 39;
const arrow_key_code_up = 38;
const arrow_key_code_down = 40;
var mouse_sensitivity = 1.0;

var renderTargetFrameBuffer;
var renderTargetTexture;
var texture_shader_program;
var texture_position_attribute;
var texture_color_attribute;
var texture_coordinate_attribute;
var texture_world_uniform;
var texture_view_uniform;
var texture_projection_uniform;
var texture_vertex_shader_source = "" +
    "attribute vec3 position; " +
    "attribute vec4 color;" +
    "attribute vec2 textureCoordinate;" +
    "varying vec2 vertexTextureCoordinate;" +
    "varying vec4 vertexColor;" +
    "uniform mat4 world;" +
    "uniform mat4 view;" +
    "uniform mat4 projection;"+
    "void main()" +
    "{" +
    "gl_Position = projection * view * world * vec4(position, 1.0);" +
    "vertexTextureCoordinate = textureCoordinate;" +
    "vertexColor = color;" +
    "}";
var texture_fragment_shader_source = "" +
    "precision mediump float;"+
    "varying vec2 vertexTextureCoordinate;" +
    "varying vec4 vertexColor;"+
    "uniform sampler2D imageSampler;"+
    "void main()" +
    "{" +
    "gl_FragColor = vertexColor * texture2D(imageSampler, vertexTextureCoordinate);" +
    "}";
var texture_position_coordinates = new Float32Array([
    -1, 1,      0,1,
    -1, -1,     0,0,
    1, -1,      1,0,
    1, 1,       1,1
]);
var texture_vertex_buffer;
var renderBuffer;
var texture_text = "Paal Mathias Ellefsen, stud.nr. 140168";
var texture_text_size = 12;
var texture_text_buffer;

var AudioVisualizer = function(){
    this.current_file = null;
    this.current_file_name = null;
    this.audio_analyzer = null;
    this.audio_context = null;
    this.audio_source = null;
    this.audio_info = document.getElementById('audio_info').innerHTML;
    this.audio_status = 0;
    this.force_audio_stop = false;
    this.update_ui_info_animation_id = null;
    this.animation_id = null;
    this.end_animation = false;
    this.surface = null;
    this.bar = null;
    this.plane = null;
    this.status_bar = null;
};

AudioVisualizer.prototype.Initialize = function(){
    this.SetApi();
    this.SetEventListeners();
    this.InitializeGraphics();
    this.InitializeInput();
    this.bar = new Bars(num_samples, new Vector3(1.0, 1.0, 1.0), new Vector3(0.2, 1.0, 1.0), 32, 0.02);
    this.bar.scale = new Vector3(0.05, 0.005, 0.05);
    this.bar.position = new Vector3(-2.5, 0.0, 2.5);
    this.plane = new PlanePrimitive(5.0, new Vector3(0.0, 0.0, 0.0));
    this.surface = new Surface(num_samples, 30, new Vector3(0.0, 0.0, 0.0), 0.02);
    this.surface.position = new Vector3(0, 0.0, 2.5);
    this.surface.scale = new Vector3(0.1, 0.005, 0.1);
    this.status_bar = new StatusBar(new Vector3(0.2, 1.0, 1.0), new Vector3(1.0, 1.0, 1.0));
    this.status_bar.scale = new Vector3(2, 0.25, 0.25)
    this.status_bar.rotation = new Vector3(0, Math.PI, 0);
};

AudioVisualizer.prototype.InitializeInput = function(){
    document.onkeydown = function(event){
        event = event || window.event;
        var keyCode = event.keyCode;

        if(keyCode ==  arrow_key_code_left){
            camera.MoveLeft(delta_time);
        }
        if(keyCode ==  arrow_key_code_right){
            camera.MoveRight(delta_time);
        }
        if(keyCode ==  arrow_key_code_down){
            camera.MoveBackward(delta_time);
        }
        if(keyCode ==  arrow_key_code_up){
            camera.MoveForward(delta_time);

        }
    };

    document.onmousedown = function(event){
        mouse_is_down = isMouseLeftButtonPressed(event);
        var canvas_position = map_canvas_position(event);

        if(isNaN(last_mouse_position_X) || isNaN(last_mouse_position_Y)){
            last_mouse_position_X = canvas_position[0];
            last_mouse_position_Y = canvas_position[1];
        }

        var mouse_position_x = canvas_position[0];
        var mouse_position_y = canvas_position[1];

        //mouse_pick(mouse_position_x, mouse_position_y);

        last_mouse_position_X = mouse_position_x;
        last_mouse_position_Y = mouse_position_y;
    };

    document.onmouseup = function(event)
    {
        mouse_is_down = false;
        var canvas_position = map_canvas_position(event);

        if(isNaN(last_mouse_position_X) || isNaN(last_mouse_position_Y)){
            last_mouse_position_X = canvas_position[0];
            last_mouse_position_Y = canvas_position[1];
        }

        var mouse_position_x = canvas_position[0];
        var mouse_position_y = canvas_position[1];
        last_mouse_position_X = mouse_position_x;
        last_mouse_position_Y = mouse_position_y;
    };

    document.onmousemove = function(event){
        var canvas_position = map_canvas_position(event);

        if(isNaN(last_mouse_position_X) || isNaN(last_mouse_position_Y)){
            last_mouse_position_X = canvas_position[0];
            last_mouse_position_Y = canvas_position[1];
        }

        var mouse_position_x = canvas_position[0];
        var mouse_position_y = canvas_position[1];

        if(mouse_is_down == true){
            var delta_mouse_X = mouse_position_x - last_mouse_position_X;
            var delta_mouse_Y = mouse_position_y - last_mouse_position_Y;

            var length = Math.sqrt(delta_mouse_X* delta_mouse_X + delta_mouse_Y * delta_mouse_Y);

            var x_direction = 0;
            var y_direction = 0;

            if(length > 0.0) {
                x_direction = delta_mouse_X / length;
                y_direction = delta_mouse_Y / length;

                if(current_camera_mode == CameraMode.ORBIT){
                    azimuth += x_direction * mouse_sensitivity;
                    elevation -= y_direction * mouse_sensitivity;
                }
                else if(current_camera_mode == CameraMode.FREE){
                    camera.Rotation(-x_direction,y_direction, delta_time);
                }
            }
        }

        last_mouse_position_X = mouse_position_x;
        last_mouse_position_Y = mouse_position_y;
    };


    document.onkeypress = function(event){
        event = event || window.event;
        var charCode = event.charCode || event.keyCode;
        var character = String.fromCharCode(charCode);

        if(character == 'W' || character == 'w'){
            camera.MoveForward(delta_time);
        }

        if(character == 'A' || character == 'a'){
            camera.MoveLeft(delta_time);
        }

        if(character == 'S' || character == 's'){
            camera.MoveBackward(delta_time);
        }

        if(character == 'D' || character == 'd'){
            camera.MoveRight(delta_time);
        }

        if(character == 'Q' || character == 'q'){
            camera.MoveDown(delta_time);
        }

        if(character == 'E' || character == 'e'){
            camera.MoveUp(delta_time);
        }
    };
};

AudioVisualizer.prototype.SetApi = function(){
    this.HandleCrossBrowser();

    try
    {
        this.audio_context = new AudioContext();
    }
    catch(exception)
    {
        this.updateUI("Unable to start audio", "ERROR");
    }
};

AudioVisualizer.prototype.SetRendererToSimpleBar = function()
{
    current_drawing_mode = DrawingMode.SINGLE_BAR
};

AudioVisualizer.prototype.SetRendererToMultiBars = function(){
    current_drawing_mode = DrawingMode.MULTI_BAR;
};

AudioVisualizer.prototype.SetRendererToSurface = function(){
    current_drawing_mode = DrawingMode.SURFACE;
};

AudioVisualizer.prototype.SetCameraToOrbit = function(){
    current_camera_mode = CameraMode.ORBIT;
    camera.elevation = 15.0;
    camera.distance = 80.0;
};

AudioVisualizer.prototype.SetCameraToFree = function(){
    current_camera_mode = CameraMode.FREE;
    camera.position = new Vector3(0, 0.5, -100);
    camera.rotation = new Vector3(0, 0, 0);
    //camera.rotation = new Vector3(Math.PI / 8.0, Math.PI / 8.0, 0);
};

AudioVisualizer.prototype.HandleCrossBrowser = function(){
    window.AudioContext = window.AudioContext || window.webkitAudioContext
    || window.mozAudioContext ||  window.msAudioContext;
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelRequestAnimationFrame
    || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
};

AudioVisualizer.prototype.InitializeGraphics = function(){

    status_info = document.getElementById('audio_status');
    message_box = document.getElementById('message_box');
    message_box_header = document.getElementById('message_box_header');
    massage_box_content = document.getElementById('message_box_content');
    canvas = document.getElementById('_canvas');
    canvas_texture = document.getElementById("_canvas_texture");

    try
    {
        graphics = canvas.getContext("experimental-webgl", {antialias : true});
        graphics2d = canvas_texture.getContext('2d');
    }
    catch(exception)
    {
       updateUI("Unable to get graphics context", "ERROR");
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.onresize = function(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        graphics.viewport(0, 0, canvas.width, canvas.height);
    };

    graphics.viewport(0, 0, canvas.width, canvas.height);
    camera = new Camera(canvas, 1.0, 1000.0, Math.PI/2.0, 2.0, 40.0, Math.PI / 100.0);
    camera.distance = 80.0;
    camera.elevation = 15.0;

    var vertex_shader = this.GetShader(vertex_shader_source, graphics.VERTEX_SHADER, "vertex");
    var fragment_shader = this.GetShader(fragment_shader_source, graphics.FRAGMENT_SHADER, "fragment");
    shader_program = graphics.createProgram();
    graphics.attachShader(shader_program, vertex_shader);
    graphics.attachShader(shader_program, fragment_shader);
    graphics.linkProgram(shader_program);
    position_attribute = graphics.getAttribLocation(shader_program, "position");
    color_attribute = graphics.getAttribLocation(shader_program, "color");
    world_uniform = graphics.getUniformLocation(shader_program, "world");
    view_uniform = graphics.getUniformLocation(shader_program, "view");
    projection_uniform = graphics.getUniformLocation(shader_program, "projection");

    var texture_vertex_shader = this.GetShader(texture_vertex_shader_source, graphics.VERTEX_SHADER, "vertex");
    var texture_fragment_shader = this.GetShader(texture_fragment_shader_source, graphics.FRAGMENT_SHADER, "fragment");
    texture_shader_program = graphics.createProgram();
    graphics.attachShader(texture_shader_program, texture_vertex_shader);
    graphics.attachShader(texture_shader_program, texture_fragment_shader);
    graphics.linkProgram(texture_shader_program);
    texture_position_attribute = graphics.getAttribLocation(texture_shader_program, "position");
    texture_color_attribute = graphics.getAttribLocation(texture_shader_program, "color");
    texture_coordinate_attribute = graphics.getAttribLocation(texture_shader_program, "textureCoordinate");
    texture_world_uniform = graphics.getUniformLocation(texture_shader_program, "world");
    texture_view_uniform = graphics.getUniformLocation(texture_shader_program, "view");
    texture_projection_uniform = graphics.getUniformLocation(texture_shader_program, "projection");

    texture_vertex_buffer = graphics.createBuffer();

    graphics2d.fillStyle = "#444444";
    graphics2d.textAlign = "center";
    graphics2d.textBaseline = "middle";
    graphics2d.font = texture_text_size+"px verdana";
    texture_text_buffer = graphics.createTexture();

    graphics.enableVertexAttribArray(position_attribute);
    graphics.enableVertexAttribArray(color_attribute);
    //this.InitializeTextures();

    Clear();
    this.Draw(null);
};

AudioVisualizer.prototype.Decode = function(){
    var file_reader = new FileReader();
    var file = this.current_file;
    var audio_visualiser = this;

    file_reader.onload = function(event){
        var file_result = event.target.result;

        if(audio_visualiser.audio_context === null){
            return;
        };

        audio_visualiser.audio_context.decodeAudioData(file_result,
            function(buffer){
                audio_visualiser.Visualize(buffer);
            },
            function(event){
                audio_visualiser.UpdateUI("Unable to decode audio from the uploaded file", "ERROR");
            });

    };

    file_reader.onerror = function(event){
        audio_visualiser.UpdateUI("Unable to read the file", "ERROR");
    };

    file_reader.readAsArrayBuffer(file);
};

AudioVisualizer.prototype.SetEventListeners = function () {
    var uploaded_file = document.getElementById('_uploaded_file');
    var audio_visualiser = this;
    uploaded_file.onchange = function(event)
    {
        if(audio_visualiser.audio_context === null)
        {
            return;
        }

        if(uploaded_file.files.length !== 0){
            audio_visualiser.current_file = uploaded_file.files[0];
            audio_visualiser.current_file_name = audio_visualiser.current_file.name;

            if(audio_visualiser.audio_status === 1){
                audio_visualiser.force_audio_stop = true;
            }
            audio_visualiser.UpdateUI("Uploading and decoding audio-data", "LOADING");
            audio_visualiser.Decode();
        }
    };

    var canvas = document.getElementById('_canvas');
};

AudioVisualizer.prototype.Play = function(){
    if(this.audio_source !== null && this.audio_status == 0) {
        //dirty use of known bug...
        this.audio_source.connect(this.audio_analyzer);
        this.audio_status = 1;
    }
};

AudioVisualizer.prototype.Pause = function(){
    if(this.audio_source !== null && this.audio_status == 1){
        this.audio_source.disconnect();
        this.audio_status = 0;
    }
};

AudioVisualizer.prototype.Stop = function(){
    if(this.audio_source !== null && this.audio_status == 1){
        this.audio_source.stop(0);
        this.audio_source.disconnect();
        this.audio_status = 0;
    }
};


AudioVisualizer.prototype.Visualize = function(buffer){
    var audio_buffer_source = this.audio_context.createBufferSource();
    this.audio_analyzer = this.audio_context.createAnalyser();
    audio_buffer_source.connect(this.audio_analyzer);
    this.audio_analyzer.connect(this.audio_context.destination);
    audio_buffer_source.buffer = buffer;
    var audio_visualiser = this;

    if(!audio_buffer_source.start){
        audio_buffer_source.start = audio_buffer_source.noteOn;
        audio_buffer_source.stop = audio_buffer_source.noteOff;
    }

    if(this.animation_id !== null){
        cancelAnimationFrame(this.animation_id);
    }

    if(this.audio_source !== null){
        this.audio_source.stop(0);
    }

    audio_buffer_source.start(0);
    this.audio_source = audio_buffer_source;

    audio_buffer_source.onended = function(){
        if(ended === false) {
            audio_visualiser.End();
            ended = true;
        }
    };

    ended = false;
    this.UpdateUI("Currently playing: " + audio_visualiser.current_file_name);
    this.audio_status = 1;
    this.Draw(this.audio_analyzer);
};

AudioVisualizer.prototype.Draw = function(analyzer){
    //graphics.useProgram(shader_program);
    //Clear();

    var audio_visualizer = this;

    var draw_all = function(time){
        delta_time = time - elapsed_time;
        delta_time = delta_time / 1000.0;

        elapsed_time = time;

        if(current_camera_mode === CameraMode.ORBIT){
            camera.target = new Vector3(0, 0, 0);
            camera.azimuth = ((camera.azimuth + azimuth_speed * delta_time) % 360.0);
        }
        else{

        }
        //draw_texture(dt);
        Clear();
        //draw_scene_texture(dt);
        draw_plane(delta_time);


        if(analyzer !== null){

            read_audio(analyzer);

            if(current_drawing_mode == DrawingMode.SINGLE_BAR) {
                draw_bars(delta_time, false);
            }
            else if(current_drawing_mode == DrawingMode.MULTI_BAR){
                draw_bars(delta_time, true);
            }
            else if(current_drawing_mode == DrawingMode.SURFACE){
                draw_surface(delta_time);
            }
        }

        ClearText();
        draw_texture_content(delta_time);
        audio_visualizer.animation_id = requestAnimationFrame(draw_all);
    };

    var read_audio = function(analyzer){
        var frequencies = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(frequencies);

        if(audio_visualizer.audio_status == 0){
            for(var index = frequencies.length - 1; index >= 0; index--){
                frequencies[index] = 0;
            }

            audio_visualizer.end_animation = true;

            for(var index = heights.length - 1; index >= 0; index--){
                audio_visualizer.end_animation = audio_visualizer.end_animation && (audio_visualizer.end_animation[index] == 0);
            }

            if(audio_visualizer.end_animation){
                window.cancelRequestAnimationFrame(audio_visualizer.animation_id);
                return;
            }
        }

        var step = Math.round(256 / num_samples);

        for(var index = 0; index < num_samples; index++)
        {
            var sample = frequencies[index * step];

            if(heights.length < num_samples){
                heights.push(sample);
            }else{
                heights[index] = sample;
            }
        }
    };

    var draw_plane = function(time){
        audio_visualizer.plane.scale = new Vector3(2.0, 2.0, 2.0);
        audio_visualizer.plane.Draw();
    };

    var draw_bars = function(time, draw_history){
        audio_visualizer.bar.Update(time);
        audio_visualizer.bar.Draw(heights, draw_history);
    };

    var draw_surface = function(time){
        audio_visualizer.surface.Update(time);
        audio_visualizer.surface.Draw(heights);
    }

    var draw_texture_content = function(time){
        audio_visualizer.status_bar.Draw();
    };

    this.animation_id = requestAnimationFrame(draw_all);
};

AudioVisualizer.prototype.Update = function(){

};

AudioVisualizer.prototype.End = function(){
  /*  if(this.force_audio_stop){
        this.force_audio_stop = false;
        this.UpdateUI("No audio is currently playing");
        this.audio_status = 0;
    }*/
};

var message_text = "";
var number_of_dots = 0;
var dots = "...........";
var animation_sleep = 300;
var update = true;
var status_message = "No audio currently playing...";

AudioVisualizer.prototype.UpdateUI = function(message, status_type){
    if(this.update_ui_info_animation_id !== null) {
        update = false;
        window.clearTimeout(this.update_ui_info_animation_id);
    }

    status_message = message;

    if(status_type === "LOADING"){
        message_text = message;
        update = true;
        this.update_ui_info_animation_id = window.setTimeout(updateAnimation, animation_sleep);
    }
    else if(status_type === "ERROR"){
        message_box_header.innerHTML = message;
        massage_box_content.innerHTML = message;
        message_box.style.display = 'inline';
    }
    else{
        status_info.innerHTML = message;
    }
};

var updateAnimation = function(){
    if(update === true){
        number_of_dots = number_of_dots + 1;
        if(number_of_dots > 5){
            number_of_dots = 0;
        }
        status_message = message_text + dots.substring(0, number_of_dots);
        status_info.innerHTML = status_message;
        this.update_ui_info_animation_id = window.setTimeout(updateAnimation, animation_sleep);
    }
};

var Clear = function(){
    graphics.enable(graphics.DEPTH_TEST);
    graphics.depthFunc(graphics.LEQUAL);
    if(heights.length > 0){
        var index = Math.round(heights.length / 2.0);
        var height = heights[index];
        var color = getColor(height);
        graphics.clearColor(color.x, color.y, color.z, color.w);
    }
    else{
        graphics.clearColor(1.0, 1.0, 1.0, 1.0);
    }
    graphics.clearDepth(1.0);

    graphics.disableVertexAttribArray(texture_position_attribute);
    graphics.disableVertexAttribArray(texture_color_attribute);
    graphics.disableVertexAttribArray(texture_coordinate_attribute);

    graphics.clear(graphics.COLOR_BUFFER_BIT | graphics.DEPTH_BUFFER_BIT);
    graphics.useProgram(shader_program);

    graphics.enableVertexAttribArray(position_attribute);
    graphics.enableVertexAttribArray(color_attribute);
};

var ClearText = function(){
    graphics.disableVertexAttribArray(position_attribute);
    graphics.disableVertexAttribArray(color_attribute);

    graphics.useProgram(texture_shader_program);

    graphics.enableVertexAttribArray(texture_position_attribute);
    graphics.enableVertexAttribArray(texture_color_attribute);
    graphics.enableVertexAttribArray(texture_coordinate_attribute);
};

AudioVisualizer.prototype.GetShader = function(source, type, typeString){
    var shader = graphics.createShader(type);
    graphics.shaderSource(shader, source);
    graphics.compileShader(shader);

    if(!graphics.getShaderParameter(shader, graphics.COMPILE_STATUS)){
        this.UpdateUI("error in " + typeString + " shader: " + graphics.getShaderInfoLog(shader), "ERROR");
    }

    return shader;
};

function Bars(num_samples, min_color, front_color, num_histories, delta_plot){
    this.position = new Vector3(0,0,0);
    this.rotation = new Vector3(0,0,0);
    this.scale = new Vector3(1,1,1);
    this.histories = [];
    this.num_histories = num_histories;
    this.delta_plot = delta_plot;
    this.timer = 0;
    this.num_triangles = 0;
    this.samples = null;
    this.num_vertices = 0;
    this.num_bars = 0;
    this.modifier_indices = [];
    this.front_color = front_color;
    this.index_buffer = graphics.createBuffer();
    this.vertex_buffer = graphics.createBuffer();
    this.vertices_array = [];
    this.indices_array = [];
    this.vertices = null;
    this.indices = null;
    var nullColor = getColor(0);

    for(var nextIndex = 0; nextIndex < num_histories; nextIndex = nextIndex + 1)
    {
        for(var index = 0; index < num_samples; index = index + 1){
            this.CreateBar(index, nextIndex, min_color, nullColor);
        }
    }
};

Bars.prototype.CreateBar = function(offsetX, offsetZ, min_color, max_color){
    this.vertices_array.extend([
        -0.5 + offsetX ,0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX,0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX, 1.0,-0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        -0.5  + offsetX, 1.0,-0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,

        -0.5 + offsetX ,0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX,0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX, 1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        -0.5  + offsetX, 1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,

        -0.5  + offsetX,0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        -0.5  + offsetX,1.0,-0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        -0.5 + offsetX ,1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        -0.5  + offsetX,0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,

        0.5  + offsetX, 0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX, 1.0,-0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        0.5  + offsetX, 1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        0.5  + offsetX, 0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,

        -0.5  + offsetX, 0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        -0.5  + offsetX, 0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX, 0.0, 0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,
        0.5  + offsetX, 0.0,-0.5 + offsetZ,     min_color.x,min_color.y,min_color.z,min_color.w,

        -0.5  + offsetX, 1.0,-0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        -0.5  + offsetX, 1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        0.5  + offsetX, 1.0, 0.5 + offsetZ,     max_color.x,max_color.y,max_color.z,max_color.w,
        0.5  + offsetX, 1.0,-0.5 + offsetZ,    max_color.x,max_color.y,max_color.z,max_color.w
    ]);

    this.indices_array.extend([
        this.num_bars * 24,  this.num_bars * 24 + 1, this.num_bars * 24 + 2,
        this.num_bars * 24,  this.num_bars * 24 + 2, this.num_bars * 24 + 3,

        this.num_bars * 24 + 4,this.num_bars * 24 + 5, this.num_bars * 24 + 6,
        this.num_bars * 24 + 4,this.num_bars * 24 + 6, this.num_bars * 24 + 7,

        this.num_bars * 24 + 8,this.num_bars * 24 + 9,  this.num_bars * 24 + 10,
        this.num_bars * 24 + 8,this.num_bars * 24 + 10, this.num_bars * 24 + 11,

        this.num_bars * 24 + 12,this.num_bars * 24 + 13, this.num_bars * 24 + 14,
        this.num_bars * 24 + 12,this.num_bars * 24 + 14, this.num_bars * 24 + 15,

        this.num_bars * 24 + 16,this.num_bars * 24 + 17, this.num_bars * 24 + 18,
        this.num_bars * 24 + 16,this.num_bars * 24 + 18,this.num_bars * 24 + 19,

        this.num_bars * 24 + 20,this.num_bars * 24 + 21, this.num_bars * 24 + 22,
        this.num_bars * 24 + 20,this.num_bars * 24 + 22, this.num_bars * 24 + 23
    ]);

    this.vertices = new Float32Array(this.vertices_array);
    this.indices = new Uint16Array(this.indices_array);

    this.modifier_indices.push(this.num_vertices + 15);
    this.modifier_indices.push(this.num_vertices + 22);
    this.modifier_indices.push(this.num_vertices + 43);
    this.modifier_indices.push(this.num_vertices + 50);
    this.modifier_indices.push(this.num_vertices + 64);
    this.modifier_indices.push(this.num_vertices + 71);
    this.modifier_indices.push(this.num_vertices + 92);
    this.modifier_indices.push(this.num_vertices + 99);
    this.modifier_indices.push(this.num_vertices + 141);
    this.modifier_indices.push(this.num_vertices + 148);
    this.modifier_indices.push(this.num_vertices + 155);
    this.modifier_indices.push(this.num_vertices + 162);

    this.num_bars = this.num_bars + 1;
    this.num_triangles = this.num_bars * 6 * 2 * 3;
    this.num_vertices = this.num_bars * (7 * 24);
};

Bars.prototype.Update = function(time){
    this.timer += time;
};

Bars.prototype.Draw = function(samples, draw_history){

    var last_samples = null;
    if(this.samples != null){
        last_samples = this.samples.slice();
    }
    else{
        last_samples = samples.slice();
    }

    this.samples = samples;

    if(this.timer >= this.delta_plot)
    {
        this.timer = this.timer - this.delta_plot;

        if(this.num_histories > this.histories.length)
        {
            this.histories.push(last_samples);
        }
        else
        {
            this.histories.shift();
            this.histories.push(last_samples);
        }
    }

    var modifier_index = 0;

    for(var index = 0; index < this.samples.length; index++)
    {
        var height = this.samples[index];
        var front_color = getColor(height);
        var color = null;

        if(height === 0.0)
        {
            color = new Vector3(0.0, 0.0, 0.0);
        }
        else{
            color = this.front_color;
        }

        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        var color_start_index = this.modifier_indices[modifier_index] + 2;

        if(height >= 0){
            this.vertices[color_start_index] = front_color.x;
            this.vertices[color_start_index + 1] = front_color.y;
            this.vertices[color_start_index + 2] = front_color.z;
            this.vertices[color_start_index + 3] = front_color.w;
        }
        else{
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
        }

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2

        if(height >= 0){
            this.vertices[color_start_index] = front_color.x;
            this.vertices[color_start_index + 1] = front_color.y;
            this.vertices[color_start_index + 2] = front_color.z;
            this.vertices[color_start_index + 3] = front_color.w;
        }
        else{
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
        }

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2

        if(height >= 0){
            this.vertices[color_start_index] = front_color.x;
            this.vertices[color_start_index + 1] = front_color.y;
            this.vertices[color_start_index + 2] = front_color.z;
            this.vertices[color_start_index + 3] = front_color.w;
        }
        else{
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
        }

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2

        if(height >= 0){
            this.vertices[color_start_index] = front_color.x;
            this.vertices[color_start_index + 1] = front_color.y;
            this.vertices[color_start_index + 2] = front_color.z;
            this.vertices[color_start_index + 3] = front_color.w;
        }
        else{
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
        }

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
        this.vertices[this.modifier_indices[modifier_index]] = this.samples[index];
        color_start_index = this.modifier_indices[modifier_index] + 2
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;

        modifier_index = modifier_index + 1;
    }

    for(var counter = this.histories.length - 1; counter >= 0; counter--)
    {
        var sample = this.histories[counter];

        for(var nextIndex = 0; nextIndex < sample.length; nextIndex++)
        {
            var color = getColor(sample[nextIndex]);

            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            var color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
            modifier_index = modifier_index + 1;

            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
            this.vertices[this.modifier_indices[modifier_index]] = sample[nextIndex];
            color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;

            modifier_index = modifier_index + 1;
        }
    }

    var translation = translate(this.position);
    var rotation = axis_rotation(this.rotation);
    var scaling = scale(this.scale);

    var world = matrixMultiplication(scaling, rotation)
    world = matrixMultiplication(world, translation);
    var view = camera.LookAt();
    var projection = camera.Perspective();

    graphics.uniformMatrix4fv(world_uniform, false, world);
    graphics.uniformMatrix4fv(view_uniform, false, view);
    graphics.uniformMatrix4fv(projection_uniform, false, projection);

    graphics.bindBuffer(graphics.ARRAY_BUFFER, this.vertex_buffer);
    graphics.bufferData(graphics.ARRAY_BUFFER, this.vertices, graphics.STATIC_DRAW);

    graphics.vertexAttribPointer(position_attribute, 3, graphics.FLOAT,false, 4 * (3 + 4), 0);
    graphics.vertexAttribPointer(color_attribute,4, graphics.FLOAT, false, 4 * (3 + 4), 4 * 3);
    //graphics.vertexAttribPointer(normal_attribute,3, graphics.FLOAT, false, 4 * (3 + 4 + 3 + 2), 4 * (3 + 4));
    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, this.index_buffer);
    graphics.bufferData(graphics.ELEMENT_ARRAY_BUFFER, this.indices, graphics.STATIC_DRAW);

    if(draw_history){
        graphics.drawElements(graphics.TRIANGLES, this.num_triangles , graphics.UNSIGNED_SHORT, 0);
    }
    else{
        graphics.drawElements(graphics.TRIANGLES, 6 * 2 * 3 * num_samples, graphics.UNSIGNED_SHORT, 0);
    }

    graphics.flush();

    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, null);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, null);
};

var Surface = function(length, breadth, min_color, delta_plot){
    this.position = new Vector3(0,0,0);
    this.rotation = new Vector3(0,0,0);
    this.scale = new Vector3(1,1,1);
    this.length = length;
    this.breadth = breadth;
    this.num_histories = breadth;
    this.vertex_buffer = graphics.createBuffer();
    this.index_buffer = graphics.createBuffer();
    this.modifier_indices = [];
    this.samples = [];
    this.histories = [];
    this.delta_plot = delta_plot;
    this.timer = 0.0;

    var vertexArray = [];
    var lengthOffset = -this.length / 2.0;
    var breadthOffset = -this.breadth / 2.0;
    for(var zIndex = 0; zIndex < this.breadth; zIndex++){
        for(var xIndex = 0; xIndex < this.length; xIndex++){
            vertexArray.push(xIndex + lengthOffset);
            vertexArray.push(0.5);
            this.modifier_indices.push(vertexArray.length - 1);
            vertexArray.push(zIndex + breadthOffset);
            vertexArray.push(min_color.x);
            vertexArray.push(min_color.y);
            vertexArray.push(min_color.z);
            vertexArray.push(min_color.w);
        }
    }

    this.vertices = new Float32Array(vertexArray);

    var indexArray = [];

    for(var zIndex = 0; zIndex < this.breadth - 1; zIndex++){
        for(var xIndex = 0; xIndex <this.length -1; xIndex++){

            var lower_left = xIndex + zIndex * this.length;
            var lower_right = (xIndex + 1) + zIndex * this.length;
            var top_left = xIndex + (zIndex + 1) * this.length;
            var top_right = (xIndex + 1) + (zIndex + 1) * this.length;

            indexArray.push(top_left);
            indexArray.push(lower_right);
            indexArray.push(lower_left);
            indexArray.push(top_left);
            indexArray.push(top_right);
            indexArray.push(lower_right);
        }
    }

    this.indices = new Uint16Array(indexArray);
    this.num_vertices = (this.breadth - 1) * (this.length - 1) * 6;
};

Surface.prototype.Update = function(time){
    this.timer += time;
};

Surface.prototype.Draw = function(sample){

    var last_samples = null;
    if(this.samples != null){
        last_samples = this.samples.slice();
    }
    else{
        last_samples = sample.slice();
    }

    this.samples = sample;

    if(this.timer >= this.delta_plot)
    {
        this.timer = this.timer - this.delta_plot;

        if(this.num_histories > this.histories.length)
        {
            this.histories.push(last_samples);
        }
        else
        {
            this.histories.shift();
            this.histories.push(last_samples);
        }
    }

    var modifier_index = 0;

    for(var index = 0; index < this.length; index++){
        var color = getColor(sample[index]);
        this.vertices[this.modifier_indices[modifier_index]] = sample[index];
        var color_start_index = this.modifier_indices[modifier_index] + 2;
        this.vertices[color_start_index] = color.x;
        this.vertices[color_start_index + 1] = color.y;
        this.vertices[color_start_index + 2] = color.z;
        this.vertices[color_start_index + 3] = color.w;
        modifier_index = modifier_index + 1;
    }

    for(var index = this.histories.length - 1; index >= 0; index--){
        var samples = this.histories[index];

        for(var nextIndex = 0; nextIndex < this.length; nextIndex++){
            var color = getColor(samples[nextIndex]);
            this.vertices[this.modifier_indices[modifier_index]] = samples[nextIndex];
            var color_start_index = this.modifier_indices[modifier_index] + 2;
            this.vertices[color_start_index] = color.x;
            this.vertices[color_start_index + 1] = color.y;
            this.vertices[color_start_index + 2] = color.z;
            this.vertices[color_start_index + 3] = color.w;
            modifier_index = modifier_index + 1;
        }
    }

    var translation = translate(this.position);
    var rotation = axis_rotation(this.rotation);
    var scaling = scale(this.scale);

    var world = matrixMultiplication(scaling, rotation)
    world = matrixMultiplication(world, translation);
    var view = camera.LookAt();
    var projection = camera.Perspective();

    graphics.uniformMatrix4fv(world_uniform, false, world);
    graphics.uniformMatrix4fv(view_uniform, false, view);
    graphics.uniformMatrix4fv(projection_uniform, false, projection);

    graphics.bindBuffer(graphics.ARRAY_BUFFER, this.vertex_buffer);
    graphics.bufferData(graphics.ARRAY_BUFFER, this.vertices, graphics.STATIC_DRAW);

    graphics.vertexAttribPointer(position_attribute, 3, graphics.FLOAT,false, 4 * (3 + 4), 0);
    graphics.vertexAttribPointer(color_attribute,4, graphics.FLOAT, false, 4 * (3 + 4), 4 * 3);
    //graphics.vertexAttribPointer(normal_attribute,3, graphics.FLOAT, false, 4 * (3 + 4 + 3 + 2), 4 * (3 + 4));
    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, this.index_buffer);
    graphics.bufferData(graphics.ELEMENT_ARRAY_BUFFER, this.indices, graphics.STATIC_DRAW);
    graphics.drawElements(graphics.TRIANGLES, this.num_vertices , graphics.UNSIGNED_SHORT, 0);

    graphics.flush();

    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, null);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, null);
};

function Camera(canvas, near, far, fieldOfView, speed, distance, rotation_speed)
{
    this.position = new Vector3(0.0, 0.0, 0.0);
    this.rotation = new Vector3(0.0, 0.0, 0.0);
    this.target = new Vector3(0,0,1);
    this.near = near;
    this.far = far;
    this.fieldOfView = fieldOfView;
    this.aspect_ratio = canvas.width / canvas.height;
    this.speed = speed;
    this.distance = distance;
    this.rotation_speed = rotation_speed;
    this.azimuth = 0;
    this.elevation = 0;
    this.min_distance = 5.0;
    this.max_distance = 200.0;
}

Camera.prototype.Rotation = function(x_direction, y_direction,delta_time)
{
    this.rotation.x += y_direction * delta_time * this.rotation_speed;
    this.rotation.y += x_direction * delta_time * this.rotation_speed;
};

Camera.prototype.LookAt = function(){

    if(current_camera_mode == CameraMode.ORBIT) {
        var azimuth_in_radians = (Math.PI / 180.0) * this.azimuth;
        var elevation_in_radians = -(Math.PI / 180.0) * this.elevation;

        var distance_vector = new Vector3(0, 0, -1.0);

        var y_axis_rotation_matrix = y_axis_rotation(azimuth_in_radians);
        var x_axis_rotation_matrix = x_axis_rotation(elevation_in_radians);
        var rotation_matrix = matrixMultiplication(x_axis_rotation_matrix, y_axis_rotation_matrix);
        distance_vector = vectorMatrixMultiplication(distance_vector, rotation_matrix);
        distance_vector.normalizeVector();
        distance_vector.multiply(this.distance);
        this.position.x = this.target.x + distance_vector.x;
        this.position.y = this.target.y + distance_vector.y;
        this.position.z = this.target.z + distance_vector.z;
    }

    var zAxis = this.Forward();
    var xAxis = this.Right();
    var yAxis = zAxis.cross(xAxis);
    yAxis.normalizeVector();

    var orientation = orientation_basis(xAxis, yAxis, zAxis);

    var translation = translate(this.position);
    var camera_world = matrixMultiplication(orientation,translation);
    return matrixInvert(camera_world);
};

Camera.prototype.Perspective = function(){
    var FOV_tan = Math.tan((Math.PI/2.0) - (((Math.PI / 180.0) * this.fieldOfView) / 2.0));

    return [FOV_tan /this.aspect_ratio , 0, 0, 0,
        0, FOV_tan, 0, 0,
        0, 0, -(this.near + this.far) / (this.near - this.far), 1.0,
        0, 0, 2.0 * (this.near * this.far) / (this.near - this.far), 0];
};

Camera.prototype.Forward = function(){
    var forward_vector = new Vector3();

    if(current_camera_mode == CameraMode.FREE){
        forward_vector.x = 0.0;
        forward_vector.y = 0.0;
        forward_vector.z = 1.0;
        var rotation_matrix = axis_rotation(this.rotation);
        forward_vector = vectorMatrixMultiplication(forward_vector, rotation_matrix);
        forward_vector.normalizeVector();
        /*forward_vector.x = this.target.x - this.position.x;
        forward_vector.y = this.target.y - this.position.y;
        forward_vector.z = this.target.z - this.position.z;*/
        forward_vector.normalizeVector();
    }
    else {
        forward_vector.x = this.target.x - this.position.x;
        forward_vector.y = this.target.y - this.position.y;
        forward_vector.z = this.target.z - this.position.z;
        forward_vector.normalizeVector();
    }
    return forward_vector;
};

Camera.prototype.Backward = function(){
    return this.Forward().negative();
};

Camera.prototype.Up = function(){
    return new Vector3(0, 1, 0);

};

Camera.prototype.Down = function(){
    return this.Up().negative();
};

Camera.prototype.Left = function() {
    var forward_vector = this.Forward();
    var up_vector = this.Up();
    var left_vector = forward_vector.cross(up_vector);
    left_vector.normalizeVector();
    return left_vector;
};

Camera.prototype.Right = function(){
    var forward_vector = this.Forward();
    var up_vector = this.Up();
    var left_vector = up_vector.cross(forward_vector);
    left_vector.normalizeVector();
    return left_vector;
};

Camera.prototype.MoveForward = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT){
        this.distance -= delta_time * this.speed;
        this.distance = Math.max(this.min_distance, Math.min(this.max_distance, this.distance));
    }
    else {
        var forward = this.Forward();
        this.position.x = this.position.x + delta_time * this.speed * forward.x;
        this.position.y = this.position.y + delta_time * this.speed * forward.y;
        this.position.z = this.position.z + delta_time * this.speed * forward.z;
    }
};

Camera.prototype.MoveBackward = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT) {
        this.distance += delta_time * this.speed;
        this.distance = Math.max(this.min_distance, Math.min(this.max_distance, this.distance));
    }else{
        var forward = this.Forward();
        this.position.x = this.position.x - delta_time * this.speed * forward.x;
        this.position.y = this.position.y - delta_time * this.speed * forward.y;
        this.position.z = this.position.z - delta_time * this.speed * forward.z;
    }
};

Camera.prototype.MoveLeft = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT){
        this.azimuth -= delta_time * this.speed;
    }
    else{
        var left = this.Left();
        this.position.x = this.position.x +  delta_time * this.speed * left.x;
        this.position.y = this.position.y +  delta_time * this.speed * left.y;
        this.position.z = this.position.z +  delta_time * this.speed * left.z;
    }
};

Camera.prototype.MoveRight = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT){
        this.azimuth += delta_time * this.speed;
    }
    else{
        var left = this.Left();
        this.position.x = this.position.x -  delta_time * this.speed * left.x;
        this.position.y = this.position.y -  delta_time * this.speed * left.y;
        this.position.z = this.position.z -  delta_time * this.speed * left.z;
    }
};

Camera.prototype.MoveUp = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT){
        this.elevation += delta_time * this.speed;
    }
    else{
        var up = this.Up();
        this.position.x = this.position.x +  delta_time * this.speed * up.x;
        this.position.y = this.position.y +  delta_time * this.speed * up.y;
        this.position.z = this.position.z +  delta_time * this.speed * up.z;
    }
};

Camera.prototype.MoveDown = function(delta_time){
    if(current_camera_mode == CameraMode.ORBIT){
        this.elevation -= delta_time * this.speed;
    }
    else{
        var up = this.Up();
        this.position.x = this.position.x -  delta_time * this.speed * up.x;
        this.position.y = this.position.y -  delta_time * this.speed * up.y;
        this.position.z = this.position.z -  delta_time * this.speed * up.z;
    }
};

var translate = function(vector){
    return[ 1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        vector.x, vector.y, vector.z, 1];
};

var scale = function(vector){
    return[ vector.x, 0, 0, 0,
        0, vector.y, 0, 0,
        0, 0, vector.z, 0,
        0, 0, 0, 1];
};

var orientation_basis = function(xAxis, yAxis, zAxis){
    return [xAxis.x, xAxis.y, xAxis.z, 0.0,
        yAxis.x, yAxis.y, yAxis.z, 0.0,
        zAxis.x, zAxis.y, zAxis.z, 0.0,
        0, 0, 0, 1.0];
};

var axis_rotation = function(vector){
    var x_axis = x_axis_rotation(vector.x);
    var y_axis = y_axis_rotation(vector.y);
    var z_axis = z_axis_rotation(vector.z);

    var axis = matrixMultiplication(x_axis, y_axis);
    axis = matrixMultiplication(axis, z_axis);
    return axis;
};

var x_axis_rotation = function(angle){
    return[ 1, 0, 0, 0,
        0, Math.cos(angle), -Math.sin(angle), 0,
        0, Math.sin(angle), Math.cos(angle), 0,
        0, 0, 0, 1];
};

var y_axis_rotation = function(angle){
    return[ Math.cos(angle), 0 , Math.sin(angle), 0,
        0, 1, 0, 0,
        -Math.sin(angle), 0, Math.cos(angle), 0,
        0, 0, 0, 1];
};

var z_axis_rotation = function(angle){
    return[ Math.cos(angle), -Math.sin(angle), 0, 0,
        Math.sin(angle), Math.cos(angle), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1];
};

function Vector3(x, y, z)
{
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = 1.0;
}

Vector3.prototype.toArray = function(){
    return [this.x, this.y, this.z, this.w];
};

Vector3.prototype.subtract = function(vector){
    this.x = this.x - vector.x;
    this.y = this.y - vector.y;
    this.z = this.z - vector.z;
};

Vector3.prototype.add = function(vector){
    this.x = this.x + vector.x;
    this.y = this.y + vector.y;
    this.z = this.z + vector.z;
};

Vector3.prototype.negative = function(){
    return new Vector3(-this.x, -this.y, -this.z);
};

Vector3.prototype.multiply = function(scalar){
    this.x = this.x * scalar;
    this.y = this.y * scalar;
    this.z = this.z * scalar;
};

Vector3.prototype.divide = function(scalar){
    this.x = this.x / scalar;
    this.y = this.y / scalar;
    this.z = this.z / scalar;
};

Vector3.prototype.cross = function(vector) {
    var v1 = this.clone();
    var v2 = vector;

    var crossX = v1.y * v2.z - v1.z * v2.y;
    var crossY = v1.z * v2.x - v1.x * v2.z;
    var crossZ = v1.x * v2.y - v1.y * v2.x;

    return new Vector3(crossX, crossY, crossZ);
};

function matrixMultiplication(a, b) {
    var a00 = a[0*4+0];
    var a01 = a[0*4+1];
    var a02 = a[0*4+2];
    var a03 = a[0*4+3];
    var a10 = a[1*4+0];
    var a11 = a[1*4+1];
    var a12 = a[1*4+2];
    var a13 = a[1*4+3];
    var a20 = a[2*4+0];
    var a21 = a[2*4+1];
    var a22 = a[2*4+2];
    var a23 = a[2*4+3];
    var a30 = a[3*4+0];
    var a31 = a[3*4+1];
    var a32 = a[3*4+2];
    var a33 = a[3*4+3];
    var b00 = b[0*4+0];
    var b01 = b[0*4+1];
    var b02 = b[0*4+2];
    var b03 = b[0*4+3];
    var b10 = b[1*4+0];
    var b11 = b[1*4+1];
    var b12 = b[1*4+2];
    var b13 = b[1*4+3];
    var b20 = b[2*4+0];
    var b21 = b[2*4+1];
    var b22 = b[2*4+2];
    var b23 = b[2*4+3];
    var b30 = b[3*4+0];
    var b31 = b[3*4+1];
    var b32 = b[3*4+2];
    var b33 = b[3*4+3];
    return [a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
        a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
        a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
        a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
        a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
        a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
        a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
        a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
        a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
        a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
        a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
        a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
        a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
        a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
        a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
        a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33];
}

function matrixInvert(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
        d * t0,
        d * t1,
        d * t2,
        d * t3,
        d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
        (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
        d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
        (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
        d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
        (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
        d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
        (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
        d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
        (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
        d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
        (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
        d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
        (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
        d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
        (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
        d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
        (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
        d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
        (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
        d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
        (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
        d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
        (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
};

function vectorMatrixMultiplication(vector, matrix) {
    var result = [];
    var vector_array = vector.toArray();
    for (var i = 0; i < 4; ++i) {
        result.push(0.0);
        for (var j = 0; j < 4; ++j)
            result[i] += vector_array[j] * matrix[j * 4 + i];
    }
    vector = new Vector3(result[0],result[1], result[2]);
    vector.w = result[3];
    return vector;
};

Vector3.prototype.length = function(){
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

Vector3.prototype.normalizeVector = function(){
    this.divide(this.length());
};

Vector3.prototype.clone = function(){
    return new Vector3(this.x, this.y, this.z);
};

var StatusBar = function(min_color, max_color){
    this.position = new Vector3(0,0,0);
    this.rotation = new Vector3(0,0,0);
    this.scale = new Vector3(1,1,1);

    this.vertices = new Float32Array([
        -0.5 ,0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,       0,1,
        0.5  ,0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,       1,1,
        0.5  , 1.0,-0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      1,0,
        -0.5  , 1.0,-0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,     0,0,

        -0.5  ,0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      1,1,
        0.5  ,0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,       0,1,
        0.5  , 1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        -0.5  , 1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,     1,0,

        -0.5  ,0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,
        -0.5  ,1.0,-0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        -0.5  ,1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        -0.5  ,0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,

        0.5  , 0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,
        0.5  , 1.0,-0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        0.5  , 1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        0.5  , 0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,

        -0.5  , 0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,     0,0,
        -0.5  , 0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,     0,0,
        0.5  , 0.0, 0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,
        0.5  , 0.0,-0.5 ,     min_color.x,min_color.y,min_color.z,min_color.w,      0,0,

        -0.5  , 1.0,-0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,     0,0,
        -0.5  , 1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,     0,0,
        0.5  , 1.0, 0.5 ,     max_color.x,max_color.y,max_color.z,max_color.w,      0,0,
        0.5  , 1.0,-0.5 ,    max_color.x,max_color.y,max_color.z,max_color.w,       0,0
    ]);

    this.indices = new Uint16Array([
        0,1,2,
        0,2,3,

        4,5,6,
        4,6,7,

        8,9,10,
        8,10,11,

        12,13,14,
        12,14,15,

        16,17,18,
        16,18,19,

        20,21,22,
        20,22,23
    ]);

    this.num_vertices = 6 * 2 * 3;
    this.index_buffer = graphics.createBuffer();
    this.vertex_buffer = graphics.createBuffer();
};

StatusBar.prototype.Draw = function(delta_time){
    canvas_texture.width = 2048;//resize_canvas_texture(graphics2d.measureText(texture_text).width);
    canvas_texture.height = 512; //resize_canvas_texture(graphics2d.measureText(2.0*texture_text_size));

    var backgroundGradient = graphics2d.createLinearGradient(0, 0, canvas_texture.width, 0);
    backgroundGradient.addColorStop("0", "white");
    backgroundGradient.addColorStop("1.0", "white");
    graphics2d.fillStyle = backgroundGradient;
    graphics2d.fillRect(0, 0, canvas_texture.width, canvas_texture.height);

    graphics2d.font = "48px Verdana";
// Create gradient
    var gradient = graphics2d.createLinearGradient(0, 0, canvas_texture.width, 0);
    gradient.addColorStop("0", "black");
    gradient.addColorStop("1.0", "black");
// Fill with gradient
    graphics2d.fillStyle = gradient;
    var message = texture_text
    var text_height = 48;
    var x = 0;
    var y = (canvas_texture.height - text_height) / 4.0;
    graphics2d.fillText(message, x, y);

    var message = status_message;
    var text_height = 48;
    var x = 0;
    var y = (canvas_texture.height - text_height) / 2.0;
    graphics2d.fillText(message, x, y);

    var translation = translate(this.position);
    var rotation = axis_rotation(this.rotation);
    var scaling = scale(this.scale);

    var world = matrixMultiplication(scaling, rotation)
    world = matrixMultiplication(world, translation);
    var view = camera.LookAt();
    var projection = camera.Perspective();

    graphics.uniformMatrix4fv(texture_world_uniform, false, world);
    graphics.uniformMatrix4fv(texture_view_uniform, false, view);
    graphics.uniformMatrix4fv(texture_projection_uniform, false, projection);

    graphics.bindTexture(graphics.TEXTURE_2D, texture_text_buffer);
    //graphics.pixelStorei(graphics.UNPACK_FLIP_Y_WEBGL, true);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_S, graphics.CLAMP_TO_EDGE);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_T, graphics.CLAMP_TO_EDGE);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MAG_FILTER, graphics.LINEAR);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MIN_FILTER, graphics.LINEAR);
    graphics.texImage2D(graphics.TEXTURE_2D, 0, graphics.RGBA, graphics.RGBA, graphics.UNSIGNED_BYTE, canvas_texture);

    graphics.bindTexture(graphics.TEXTURE_2D, texture_text_buffer);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, this.vertex_buffer);
    graphics.bufferData(graphics.ARRAY_BUFFER, this.vertices, graphics.STATIC_DRAW);

    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, this.index_buffer);
    graphics.bufferData(graphics.ELEMENT_ARRAY_BUFFER, this.indices, graphics.STATIC_DRAW);

    graphics.vertexAttribPointer(texture_position_attribute, 3, graphics.FLOAT,false, 4 * (3 + 4 + 2), 0);
    graphics.vertexAttribPointer(texture_color_attribute, 4, graphics.FLOAT, false, 4 * (3 + 4 + 2), 4 * 3)
    graphics.vertexAttribPointer(texture_coordinate_attribute,2, graphics.FLOAT, false, 4 * (3 + 4 + 2), 4 * (3 + 4));
    graphics.drawElements(graphics.TRIANGLES, this.num_vertices , graphics.UNSIGNED_SHORT, 0);

    graphics.flush();

    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, null);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, null);
};

var PlanePrimitive = function(size, color)
{
    this.position = new Vector3(0,0,0);
    this.rotation = new Vector3(0,0,0);
    this.scale = new Vector3(1,1,1);

    this.vertices = new Float32Array([
        -0.5*size,  0.0,  -0.5*size,     color.x,color.y,color.z,color.w,
        -0.5*size,  0.0,   0.5*size,     color.x,color.y,color.z,color.w,
         0.5*size,  0.0,   0.5*size,     color.x,color.y,color.z,color.w,
         0.5*size,  0.0,  -0.5*size,     color.x,color.y,color.z,color.w
    ]);

    this.indices = new Uint16Array(
        [  0,1,2,
            0,3,2
        ]
    );

    this.vertex_buffer = graphics.createBuffer();
    this.index_buffer = graphics.createBuffer();
    this.num_vertices = 6;
};

var getColor = function(height){
    if(height >= 240){
        return new Vector3(1.0, 1.0, 1.0);
    }
    if(height >= 220){
        return new Vector3(1.0, 0.0, 0.0);
    }
    if(height >= 200){
        return new Vector3(1.0, 0.5, 0.0);
    }
    if(height >= 180){
        return new Vector3(1.0, 1.0, 0.0);
    }
    if(height >= 160){
        return new Vector3(0.5, 1.0, 0.0);
    }
    if(height >= 140){
        return new Vector3(0.0, 1.0, 0.0);
    }
    if(height >= 120){
        return new Vector3(0.0, 1.0, 0.5);
    }
    if(height >= 100){
        return new Vector3(0.0, 1.0, 1.0);
    }
    if(height >= 80){
        return new Vector3(0.0, 0.5, 1.0);
    }
    if(height >= 60){
        return new Vector3(0.0, 0.0, 1.0);
    }
    if(height >= 40){
        return new Vector3(0.5, 0.0, 1.0);
    }
    if(height >= 20){
        return new Vector3(1.0, 0.0, 1.0);
    }
    if(height > 0){
        return new Vector3(1.0, 0.0, 0.5);
    }

    return new Vector3(0.0, 0.0, 0.0);
}

PlanePrimitive.prototype.Draw = function(){

    var translation = translate(this.position);
    var rotation = axis_rotation(this.rotation);
    var scaling = scale(this.scale);

    var world = matrixMultiplication(scaling, rotation)
    world = matrixMultiplication(world, translation);
    var view = camera.LookAt();
    var projection = camera.Perspective();

    graphics.uniformMatrix4fv(world_uniform, false, world);
    graphics.uniformMatrix4fv(view_uniform, false, view);
    graphics.uniformMatrix4fv(projection_uniform, false, projection);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, this.vertex_buffer);
    graphics.bufferData(graphics.ARRAY_BUFFER, this.vertices, graphics.STATIC_DRAW);
    graphics.vertexAttribPointer(position_attribute, 3, graphics.FLOAT,false, 4 * (3 + 4), 0);
    graphics.vertexAttribPointer(color_attribute,4, graphics.FLOAT, false, 4 * (3 + 4), 4 * 3);
    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, this.index_buffer);
    graphics.bufferData(graphics.ELEMENT_ARRAY_BUFFER, this.indices, graphics.STATIC_DRAW);
    graphics.drawElements(graphics.TRIANGLES, this.num_vertices , graphics.UNSIGNED_SHORT, 0);

    graphics.flush();

    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, null);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, null);
};

var map_canvas_position = function(event)
{
    var bounds = event.target.getBoundingClientRect();
    var x = event.clientX;
    var y = event.clientY;

    x_coord_one = ((x - bounds.left) - canvas.width/2)/(canvas.width/2);
    y_coord_one = (canvas.height/2 - (y - bounds.top))/(canvas.height/2);

    return [x_coord_one,y_coord_one];
};

var isMouseLeftButtonPressed = function(event){
    if ('buttons' in event) {
        return event.buttons === 1;
    } else if ('which' in event) {
        return event.which === 1;
    } else {
        return event.button === 1;
    }

    return false;
};

var resize_canvas_texture = function(res, pow){
    var power =  pow || 1;

    while(power < res){
        power = power * 2;
    }

    return power;
};

Array.prototype.extend = function (other_array) {
    other_array.forEach(function(v) {this.push(v)}, this);
};