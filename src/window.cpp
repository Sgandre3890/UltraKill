#include "glad/glad.h"
#include "GLFW/glfw3.h"
#include <iostream>
#include "window.h"

namespace WIN {
    const unsigned int SCR_WIDTH = 800;
    const unsigned int SCR_HEIGHT = 800;
    GLFWwindow* window = nullptr;

    void framebuffer_size_callback(GLFWwindow* window, int width, int height)
    {
        glViewport(0, 0, width, height);
    }

    void processInput(GLFWwindow *window)
    {
        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
            glfwSetWindowShouldClose(window, true);
    }

    int initializeWindow(int SCR_WIDTH, int SCR_HEIGHT, const char* title)
    {
        if (!glfwInit()) {
            std::cout << "Failed to initialize GLFW" << std::endl;
            return -1;
        }

        // Setup GLFW
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

        window = glfwCreateWindow(SCR_WIDTH, SCR_HEIGHT, title, NULL, NULL);
        if (window == NULL)
        {
            std::cout << "Failed to create GLFW window" << std::endl;
            glfwTerminate();
            return -1;
        }
        glfwMakeContextCurrent(window);
        glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

        if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
        {
            std::cout << "Failed to initialize GLAD" << std::endl;
            return -1;
        }
        return 0;
    }

    void terminateWindow()
    {
        glfwDestroyWindow(window);
        glfwTerminate();
    }
}