#include "camera.h"

//Camera constructor
Camera::Camera(int SCR_WIDTH, int SCR_HEIGHT, glm::vec3 position)
{
    //Copies screen dimensions for default camera/mouse position
    this->SCR_WIDTH = SCR_WIDTH;
    this->SCR_HEIGHT = SCR_HEIGHT;

    //Sets default camera position/orientation
    Position = position;
    Orientation = glm::vec3(0.0f, 0.0f, -1.0f);
}

//Finalizes calculations of camera orientations, perspective, location, etc
void Camera::updateMatrix(float FOVdeg, float nearPlane, float farPlane)
{
    //Defaults view and projection matrices to identity
    glm::mat4 view = glm::mat4(1.0f);
    glm::mat4 projection = glm::mat4(1.0f);

    //Handles trimming of vertices outside view
    view = glm::lookAt(Position, Position + Orientation, Up);

    //Handles perspective and shrinking sizes over distance
    projection = glm::perspective(glm::radians(FOVdeg),(float)SCR_WIDTH / (float)SCR_HEIGHT,nearPlane, farPlane);

    //Sets camera orientation to finalizes result of view and perspective
    camMatrix = projection * view;
}

void Camera::Matrix(Shader& shader, const char* uniform) 
{
    glUniformMatrix4fv(glGetUniformLocation(shader.ID, uniform), 1, GL_FALSE, glm::value_ptr(camMatrix));
}

void Camera::Inputs(GLFWwindow* window)
{
    // --- Movement ---
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)
        Position += speed * Orientation;
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)
        Position -= speed * Orientation;
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)
        Position -= glm::normalize(glm::cross(Orientation, Up)) * speed;
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)
        Position += glm::normalize(glm::cross(Orientation, Up)) * speed;

    if (glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS)
        Position += Up * speed;
    if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS)
        Position -= Up * speed;

    // --- Mouse look ---
    static double lastMouseX = SCR_WIDTH / 2.0;
    static double lastMouseY = SCR_HEIGHT / 2.0;

    if (glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_LEFT) == GLFW_PRESS)
    {
        glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);

        double mouseX, mouseY;
        glfwGetCursorPos(window, &mouseX, &mouseY);

        if (firstClick)
        {
            // Initialize last positions to avoid a sudden jump
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            firstClick = false;
            return; // skip this frame
        }

        // Calculate deltas (movement since last frame)
        float deltaX = (float)(mouseX - lastMouseX);
        float deltaY = (float)(mouseY - lastMouseY);

        // Update last positions
        lastMouseX = mouseX;
        lastMouseY = mouseY;

        // Apply sensitivity
        float rotX = sensitivity * deltaY;
        float rotY = sensitivity * deltaX;

        // Pitch: rotate around right axis
        glm::vec3 right = glm::normalize(glm::cross(Orientation, Up));
        glm::mat4 pitchMat = glm::rotate(glm::mat4(1.0f), glm::radians(-rotX), right);
        glm::vec3 newOrientation = glm::mat3(pitchMat) * Orientation;

        // Clamp pitch
        float pitchAngle = glm::degrees(glm::asin(newOrientation.y));
        if (pitchAngle < 85.0f && pitchAngle > -85.0f)
            Orientation = newOrientation;
        else if (pitchAngle > 85.0f)
            Orientation.y = glm::sin(glm::radians(85.0f));
        else if (pitchAngle < -85.0f)
            Orientation.y = glm::sin(glm::radians(-85.0f));

        // Yaw: rotate around global Up
        glm::mat4 yawMat = glm::rotate(glm::mat4(1.0f), glm::radians(-rotY), Up);
        Orientation = glm::mat3(yawMat) * Orientation;

        // Normalize to avoid drift
        Orientation = glm::normalize(Orientation);
    }
    else
    {
        glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_NORMAL);
        firstClick = true; // reset for next time
    }

}