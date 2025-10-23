#pragma once
namespace Window {

    extern GLFWwindow* window;
    extern const unsigned int SCR_WIDTH;
    extern const unsigned int SCR_HEIGHT;

    int initializeWindow(int SCR_WIDTH, int SCR_HEIGHT, const char* title);
    void terminateWindow();
    void processInput(GLFWwindow* window);
    void framebuffer_size_callback(GLFWwindow* window, int width, int height);

}