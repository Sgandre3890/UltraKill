#include <iostream>
#include "glad/glad.h"
#include "GLFW/glfw3.h"
#include "window.h"



int main() {

    if (WIN::initializeWindow(WIN::SCR_WIDTH, WIN::SCR_HEIGHT, "UltraKill 🗣️🔥") != 0)
        return -1;

    while(!glfwWindowShouldClose(WIN::window)) {
        
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        WIN::processInput(WIN::window);
        glfwSwapBuffers(WIN::window);
        glfwPollEvents();
    }
    
   
    return 0;
}

