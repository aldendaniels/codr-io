To create a fav icon:

  1. Open the SVG inInc Scape
  
  2. Generate the desired sizes as PNGs via the export . . . menu (16x16 and 32x32)
  
  3. Use http://convertico.org/Multi_Image_to_one_icon/ to create the .ico file.

  4. In your HTML use:
     
     <link rel="shortcut icon" type="image/x-icon" sizes="32x32" href="/images/favicon.ico">

     The sizes="" atribute make Chrome "Application Shortcuts" use the correct size.